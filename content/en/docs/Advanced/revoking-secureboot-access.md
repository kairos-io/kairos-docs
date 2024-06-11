---
title: "Revoking secure boot access"
linkTitle: "Revoking secure boot access"
weight: 10
---

This document describes how an administrator can prevent certain OS images from
booting on their hardware in the context of ["Trusted Boot"]({{< relref "../architecture/trustedboot" >}}).

Two different scenarios will be covered, with the process being only slightly different for each case.

## Scenario 1 - Signing certificate no longer trusted

The process of creating signed images that can be trusted to boot, requires the
signing keys to be safe and only accessible to the vendor that produces the OS images.

In the unfortunate case in which a signing certificate has been compromised, it's
important that the keys is blacklisted it on every machine.
Failing to do so, will allow be possible for the malicious actor with access to the key,
to generate OS images that the system will accept to boot.
This will allow them boot and decrypt the filesystem, thus gaining full access
to the data on that machine and full control over it.

The UEFI firmware has a special "database" in which blacklisted certificates can
be "enrolled" (image hashes can also be enrolled, but more on that on the next scenario).

If only one machine is running the signed OS images and physical access to that machine is
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

If you followed [the instructions to create signing keys]({{< relref "../Installation/trustedboot.md#key-generation" > }}), you should have a directory with a `db.pem` certificate. This is the certificate
we will blacklist. To do so we need to convert it to the "esl" format and then
sign it to create the final `.auth` file which will be used for enrollement.
The utilities used are usually shipped in the various distros under a name like `efitools` (e.g. in Ubuntu). Here are the commands to generate the needed signed authenticated variables file:

```bash
$ export UUID=`uuidgen`
$ cert-to-efi-sig-list -g "Kairos-$UUID" keys/db.pem db-dbx.esl
$ sign-efi-sig-list -c keys/KEK.pem -k keys/KEK.key dbx db-dbx.esl db-dbx.auth
```

(Notice how we sign the `.auth` file using the "KEK" key so that enrollement is allowed)

### PCRs and disk encryption

As described in the ["Trusted Boot"]({{< relref "../architecture/trustedboot" >}}) documentation page,
the decryption of the disk partitions is bound to some PCR registers on the TPM chip.
Specifically registers 11 and 7.
There are 2 ways to bind to a PCR register, the direct and the indirect. You can
read more in the [`systemd-cryptenroll` docs](https://www.freedesktop.org/software/systemd/man/latest/systemd-cryptenroll.html#TPM2%20PCRs%20and%20policies) but in a nutshell, the indirect binding
allows the actual value of the PCR to change while the direct one does not.
For this reason, in Kairos, the decryption is bound indirectly to PCR 11 (which allows
us to upgrade to newer kernels) and directly to PCR 7, which prevents booting if
the UEFI databases have been altered, e.g. by enrolling a new key.

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

TODO - write the following steps:

#### Generate a new db cert
#### Sign the new image with the new certificate
#### Enroll the new certificate in db
#### Enroll the old certificate in dbx
#### Upgrade to the new image
#### Unbind PCR 7
#### Reboot
#### Bind again to PCR 11 and 7
#### Reboot to ensure everything works
