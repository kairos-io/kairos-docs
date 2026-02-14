---
title: "Revoking secure boot access"
sidebar_label: "Revoking secure boot access"
sidebar_position: 10
date: 2022-06-12
---

This document describes how an administrator can prevent certain OS images from
booting on their hardware in the context of ["Trusted Boot"](../architecture/trustedboot).

Two different scenarios will be covered, with the process being only slightly different for each case.

## Scenario 1 - Signing certificate is no longer trusted

The process of creating signed images that can be trusted to boot, requires the
signing keys to be safe and only accessible to the vendor that produces the OS images.

In the unfortunate case in which a signing certificate has been compromised, it's
important that the key is blacklisted on every machine.
Failing to do so, will make it possible for the malicious actor with access to the key,
to generate OS images that the system will accept to boot.
This will allow them boot and decrypt the filesystem, thus gaining full access
to the data on that machine and full control over it.

The UEFI firmware has a special "database" in which blacklisted certificates can
be "enrolled" (image hashes can also be enrolled, but more on that on the next scenario).

If only one machine is running the signed OS images, and physical access to that machine is
possible, then usually the simplest way is to boot into the machine's UEFI management utility
and enroll the certificate in the `dbx` database manually. 

If this process has to be performed on thousands of machines remotely, then it's clear
that another approach is required.

Before going over the steps on how to "blacklist" a certificate by enrolling it
in `dbx`, here is some useful information which will make the steps more clear.

### From "pem" to "auth"

The signing certificates are usually stored in one of the well known certificate
formats, e.g. "pem". If a certificate is stored in a different format, it's usually
possible to convert to "pem" with some utility. For this reason we will assume
the certificate is in the "pem" format from now on.

There are various utilities in Linux that allow enrolling certificates in the UEFI
databases but they require those certs to be in a specific format usually in the
ESL (EFI Signature List) or the signed version of the same format, the "signed variables"
format. Using the signed version has the benefit that no private keys need to be present
in order to do the enrollement, while using the unsigned format needs the private
keys to be present.

If you followed [the instructions to create signing keys](../Installation/trustedboot.md#key-generation), you should have a directory with a `db.pem` certificate. This is the certificate
we will blacklist. To do so, we need to convert it to the "esl" format and then
sign it to create the final `.auth` file, which will be used for enrollement.
The utilities used are usually shipped in the various distros under a name like `efitools` (e.g. in Ubuntu). Here are the commands to generate the needed signed authenticated variables file:

```bash
export UUID=`uuidgen`
cert-to-efi-sig-list -g "Kairos-$UUID" keys/db.pem db-dbx.esl
sign-efi-sig-list -c keys/KEK.pem -k keys/KEK.key dbx db-dbx.esl db-dbx.auth
```

(Notice how we sign the `.auth` file using the "KEK" key so that enrollement is allowed)

### PCRs and disk encryption

As described in the ["Trusted Boot"](../architecture/trustedboot) documentation page,
the decryption of the disk partitions is bound to some PCR registers on the TPM chip.
Specifically registers 11 and 7.
There are 2 ways to bind to a PCR register, the direct and the indirect. You can
read more in the [`systemd-cryptenroll` docs](https://www.freedesktop.org/software/systemd/man/latest/systemd-cryptenroll.html#TPM2%20PCRs%20and%20policies) but in a nutshell, the indirect binding
allows the actual value of the PCR to change while the direct one does not.
**For this reason, in Kairos, the decryption is bound indirectly to PCR 11 (which allows
us to upgrade to newer kernels) and directly to PCR 7, which prevents booting if
the UEFI databases have been altered, e.g. by enrolling a new key.**

And although this makes sense, security wise, it's exactly what we are trying to achieve here. We
want to enroll a certificate in `dbx`. This would change the value of PCR 7 thus
decryption of the disk partitions will no longer be possible after reboot.

The method we use to overcome this issue is this:
- We "unbind" decryption from PCR 7, binding only to PCR 11 indirectly.
- We enroll the blacklisted cert in dbx.
- We reboot to the upgraded system.
- We bind decryption again both to PCR 11 and 7 (as before).

When we rebind to PCR 7, the register has the new value which includes the cert in dbx.

### Steps

With the above now clarified, here are the steps to revoke the `db.pem` certificate from user space in Kairos.

#### Generate a new db cert

Since it's only the db key that we are trying to replace, we can start by copying
the original directory generated by `auroraboot genkey` and remove the old db files.

```bash
cp keys new-keys
rm new-keys/db.*
```

Now create the new db files:

```bash
uuidgen --random > GUID.txt
openssl req -newkey rsa:4096 -nodes -keyout db.key -new -x509 -sha256 -days 3650 -subj "/CN=NewKairosDB/" -out db.crt
openssl x509 -outform DER -in db.crt -out db.cer
cert-to-efi-sig-list -g "$(< GUID.txt)" db.crt db.esl
sign-efi-sig-list -g "$(< GUID.txt)" -k KEK.key -c KEK.pem db db.esl db.auth
```

If you are planning to use `auroraboot build-uki` command to prepare the new OS image,
create the following formats too or the command might complain if they are missing:

```bash
$ openssl x509 -outform der -in db.crt -out db.der
$ openssl x509 -inform DER -outform PEM -in db.der -out db.pem
```

#### Sign the new image with the new certificate

The `new-keys` directory created above can be used to prepare the new image with `auroraboot`. E.g.

```bash
docker run --rm -v $PWD/unpacked:/unpacked \
  -v $PWD/build:/result \
  -v $PWD/new-keys/:/keys \
  quay.io/kairos/auroraboot:{{< auroraBootVersion >}} \
  build-uki \
  --output-dir /result \
  --keys /keys \
  --output-type container \
  --boot-branding "KairosNewUKI" \
  dir:/unpacked
```

#### Enroll the new certificate in db

From withing Kairos (still booted in the old image), enroll the new db key:

```bash
sudo chattr -i /sys/firmware/efi/efivars/{PK,KEK,db}*
efi-updatevar -f db.auth db
```

:::warning Warning
You will need the `efitools` installed on the Kairos image for this commands to work!
:::
#### Upgrade to the new image

```
kairos-agent upgrade --source oci:myimage
```

#### Unbind PCR 7

Bind partition encryption only to PCR 11 policy. From within Kairos again:

```bash
echo "Generating temporary passphrase"
dd if=/dev/random bs=32 count=1 of=/tmp/random_keyfile

echo "Adding password slot"
# We temporarily switch to a passphrase decryption here, so that we can remove the "tpm" decryption
# option below. After we add the "tpm" option back (bound to different PCR registers),
# we remove the passphrase again.
cryptsetup luksAddKey --token-type systemd-tpm2 /dev/vda2 /tmp/random_keyfile
cryptsetup luksAddKey --token-type systemd-tpm2 /dev/vda3 /tmp/random_keyfile

echo "Removing the tpm2 slot"
systemd-cryptenroll /dev/vda2 --wipe-slot=tpm2
systemd-cryptenroll /dev/vda3 --wipe-slot=tpm2

echo "Adding tpm2 slot again (pcr 11 policy only, no pcr 7)"
systemd-cryptenroll --unlock-key-file=/tmp/random_keyfile --tpm2-public-key=/run/systemd/tpm2-pcr-public-key.pem --tpm2-public-key-pcrs=11 --tpm2-pcrs= --tpm2-signature=/run/systemd/tpm2-pcr-signature.json --tpm2-device-key=/run/systemd/tpm2-srk-public-key.tpm2b_public /dev/vda2
systemd-cryptenroll --unlock-key-file=/tmp/random_keyfile --tpm2-public-key=/run/systemd/tpm2-pcr-public-key.pem --tpm2-public-key-pcrs=11 --tpm2-pcrs= --tpm2-signature=/run/systemd/tpm2-pcr-signature.json --tpm2-device-key=/run/systemd/tpm2-srk-public-key.tpm2b_public /dev/vda3

echo "Removing the password slot"
systemd-cryptenroll --wipe-slot=password /dev/vda2
systemd-cryptenroll --wipe-slot=password /dev/vda3
```

Make sure you use the correct device paths for your encrypted partitions
(`/dev/vda2` and `/dev/vda3` in the example).

#### Enroll the old certificate in dbx

As describe earlier in this document, you should generate a `db-dbx.auth` file
from the old db key. This should now be enrolled in dbx. In user space again
(booted in the old Kairos image):

```bash
sudo efi-updatevar -f db-dbx.auth dbx
```


#### Reboot to the upgraded image:

```bash
reboot
```

#### Bind again to PCR 11 and 7

After rebooting to the upgraded image, bind the encryption again to PCR 7 (and 11):

```bash
echo "Generating temporary passphrase"
dd if=/dev/random bs=32 count=1 of=/tmp/random_keyfile

echo "Adding password slot"
cryptsetup luksAddKey --token-type systemd-tpm2 /dev/vda2 /tmp/random_keyfile
cryptsetup luksAddKey --token-type systemd-tpm2 /dev/vda3 /tmp/random_keyfile

echo "Removing the tpm2 slot"
systemd-cryptenroll /dev/vda2 --wipe-slot=tpm2
systemd-cryptenroll /dev/vda3 --wipe-slot=tpm2

echo "Adding tpm2 slot again (pcr 11 policy AND pcr 7)"
echo "There is probably a bug in systemd preventing us from using the --tpm2-device-key"
echo "giving this error: 'Must provide all PCR values when using TPM2 device key.'"
echo "coming from here: https://github.com/systemd/systemd/blob/7c6028bbcbd03f91e1c4b84dcf46b45e9672c2b6/src/cryptenroll/cryptenroll-tpm2.c#L362"
echo "so we'll opt for --tpm-device=auto"
echo "The command that fails was originally tried in this script:"
echo "https://github.com/kairos-io/kairos/issues/2429#issuecomment-2136728261"
systemd-cryptenroll --unlock-key-file=/tmp/random_keyfile --tpm2-public-key=/run/systemd/tpm2-pcr-public-key.pem --tpm2-public-key-pcrs=11 --tpm2-pcrs=7 --tpm2-signature=/run/systemd/tpm2-pcr-signature.json --tpm2-device=auto /dev/vda2
systemd-cryptenroll --unlock-key-file=/tmp/random_keyfile --tpm2-public-key=/run/systemd/tpm2-pcr-public-key.pem --tpm2-public-key-pcrs=11 --tpm2-pcrs=7 --tpm2-signature=/run/systemd/tpm2-pcr-signature.json --tpm2-device=auto /dev/vda3

echo "Removing the password slot"
systemd-cryptenroll --wipe-slot=password /dev/vda2
systemd-cryptenroll --wipe-slot=password /dev/vda3
```

The following command:

```bash
cryptsetup luksDump /dev/vda2 | grep "pcrs: "
```

should show output similar to this:

```
	tpm2-hash-pcrs:   7
	tpm2-pubkey-pcrs: 11
```

which means the decryption is now bound again to PCR 7 (directly) and PCR 11 (indirectly).

This command:

```
systemd-cryptenroll /dev/vda2
```

should only show `tmp2` (and not `password`)

(same thing for `/dev/vda3`)

You can now reboot to check if everything works correctly

```bash
reboot
```

#### Verifying that it worked

- Check what keys are enrolled in UEFI db:

```
mokutil --list-enrolled --db | grep -E 'Issuer:|Subject:'
```

You should find your new certificate in the list

- Check if the old certificate is in dbx:

```
mokutil --list-enrolled --dbx | grep -E 'Issuer:|Subject:'
```

You should find your old certificate in the list.

- Check that the old images are not bootable

Just reboot and when presented with the boot menu, select "fallback" or "recovery".
Since those images haven't been upgraded yet, they are still signed with the old
certificate. They should not boot and UEFI should show an error.


#### Upgrading recovery

After successfully booting to "active", you can now upgrade `recovery` to make
can still boot if the next update goes wrong.

Obviously the recovery image will also need to be signed with the new certificate.

The upgrade command is:

```
kairos-agent upgrade --recovery --source oci:<YOUR_UPGRADE_IMAGE_HERE>
```

The "fallback" image will be upgraded on the next upgrade. Read the ["Container based"](../architecture/container)
document to understand more.

## Scenario 2 - One specific image is no longer trusted

In the previous scenario, we assumed that the signing certificate was compromised, which meant no image signed by that certificate should be bootable anymore.

In this scenario, only one specific image is considered "bad". For example, an image shipped with a well known security vulnerability.
In order to prevent this image from booting, its "hash" can be blacklisted.

The process is exactly the same as above, but instead of enrolling a certificate in the `dbx` database, we will enroll an image hash.

Follow the same instructions as in scenario 1, but skipping the steps where a new `db` key is created.

To generate the file which will be enrolled to `dbx`, we need access to the `.efi` image.
If there is a system still running the image that is going to be blacklisted,
the file will be: `/efi/EFI/kairos/active.efi`.

Since the image is not considered safe (that's the reason for blacklisting it after all),
it's advisable to not boot it or use it for the calculation. If it's possible,
boot from another, safe image, mount the efi partition and find the `active.efi` file
on the disk.

As a last option, if you still have access to the original install ISO that was used to
install the "bad" image, you can extract the `.efi` file from that using standard linux tools.

The steps to generate the `.auth` file are (assumes you have `efitools` installed):

```bash
# generate the esl file
hash-to-efi-sig-list /efi/EFI/kairos/active.efi active.esl
```

Now `scp` that file to the machine where you have access to the image signing keys generated by auroraboot.
The command to sign the `esl` file is similar to the one for the certificates:

```bash
sign-efi-sig-list -c keys/KEK.pem -k keys/KEK.key dbx active.esl active.auth
```

`active.auth` is the file that should be enrolled to `dbx`, exactly like we did with the `db-dbx.auth` file
in the previous scenario. The rest of the steps are similar.

Always keep in mind that after enrolling something (key or hash) to dbx, blacklisted OSes won't boot.
Make sure you have successfully completed all the needed steps before you reboot, otherwise you may not be able to boot.
