---
title: "Manage kcrypt data in TPM NV storage"
sidebar_label: "TPM NV storage"
description: Inspect, read, and remove kcrypt data from TPM non-volatile storage.
sidebar_position: 10
---

The `kairos-agent kcrypt` command includes tools for TPM non-volatile (NV)
storage. Use these tools to inspect legacy local passphrase data or remove an
obsolete NV index.

All commands on this page require root privileges. They use NV index
`0x1500000` unless you set `--nv-index`. This index is the legacy location for
the local disk encryption passphrase.

Use `--tpm-device` if Kairos must use a specific TPM device. If you omit the
option, the command uses the configured device or the system default.

:::danger Protect disk encryption data

The `readnv` command can print a disk encryption passphrase. Do not run it in a
recorded terminal or store its output in logs.

The `cleanupnv` command permanently removes an NV index. Removing the index
that contains an active passphrase can make the encrypted disk unbootable.

:::

## Check an NV index

Check that an index exists and contains data before you read or remove it:

```bash
sudo kairos-agent kcrypt checknv --nv-index 0x1500000
```

The command returns a nonzero exit code if it cannot read data from the index.

To use a specific TPM device, add the device path:

```bash
sudo kairos-agent kcrypt checknv \
  --nv-index 0x1500000 \
  --tpm-device /dev/tpmrm0
```

## Read an NV index

Read and decrypt the value in an index:

```bash
sudo kairos-agent kcrypt readnv --nv-index 0x1500000
```

The command writes the decrypted value to standard output. If decryption
fails, the command warns you and writes the raw value instead.

Some encrypted values require a certificate index for decryption. Set the
certificate index with `--c-index`:

```bash
sudo kairos-agent kcrypt readnv \
  --nv-index 0x1500000 \
  --c-index 0x1500001
```

If you omit `--c-index`, the command uses `kcrypt.challenger.c_index` from the
Kairos configuration when that value exists.

## Remove an NV index

First, make sure that the installed system no longer needs the index. Then run
the cleanup command:

```bash
sudo kairos-agent kcrypt cleanupnv --nv-index 0x1500000
```

The command shows the selected index and waits for you to type `yes`. Any other
response cancels the operation.

For unattended recovery scripts, you can skip the prompt:

```bash
sudo kairos-agent kcrypt cleanupnv \
  --nv-index 0x1500000 \
  --i-know-what-i-am-doing
```

Use this option only when the script selects the intended index explicitly.
The command cannot restore an index after removal.
