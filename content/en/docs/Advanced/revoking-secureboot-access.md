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

