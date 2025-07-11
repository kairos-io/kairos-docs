---
title: "Keylime agent"
linkTitle: "Keylime agent"
description: This section describes an example on how to create a custom derivative with the Keylime agent
---

This example how to use Keylime with Kairos in order to provide verified measurement for runtime binaries or files in a Kairos system. This, for instance involve having measurements for specific files in the persistent portion of the disk, or the configuration directories.

Most of the steps are already covered in the [Keylime documentation](https://keylime-docs.readthedocs.io/en/latest/). Here we will cover the steps that are specific to Kairos.

## Extend Kairos

First of all we need to create a Kairos derivative with the keylime agent, in order to do this we use the [Kairos factory process](https://kairos.io/docs/reference/kairos-factory/) where we will build our own OS derivative to bundle keylime-agent:


```Dockerfile
# Build the keylime agent
FROM ubuntu:24.04 AS keylime-build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git gcc libclang-dev libssl-dev libtss2-dev libzmq3-dev pkg-config rustup make && rm -rf /var/lib/apt/lists/*
WORKDIR /keylime
RUN git clone --depth 1 --branch v0.2.7 https://github.com/keylime/rust-keylime.git /keylime
# Set up install destination dir so we can reuse the build artifacts for our Kairos image
ENV DESTDIR=/keylime-output
RUN rustup default stable && make && make install

# Build the final image with the keylime agent copied over, only systemd supported for now
FROM quay.io/kairos/rockylinux:9-core-amd64-generic-v3.4.1 AS default
COPY --from=keylime-build /keylime-output/ /
```

Then you can build your image with the agent on it:

```bash
docker build -t kairos-keylime .
```


That will generate an artifact based on the Kairos image with the keylime-agent installed.

Then you need at a minimum the follow configuration in your cloud config:

```yaml
#cloud-config

install:
   auto: true
   reboot: true
   device: /dev/vda
   bind_mounts:
      - /var/lib/keylime
   grub_options:
      extra_cmdline: "ima_appraise=fix ima_template=ima-ng ima_policy=custom" # custom policy will load it from /etc/ima/ima-policy

stages:
   initramfs:
      - name: "Set user and password"
        users:
           kairos:
              passwd: "kairos"
              groups:
                 - "admin"
           keylime:
              groups:
                 - "tss"
        hostname: "kairos-keylime"
      - files:
           - name: Set default IMA policy # In initramfs as the kernel will load it on rootfs pivot
             path: /etc/ima/ima-policy
             permissions: 0644
             content: |
                # PROC_SUPER_MAGIC
                dont_measure fsmagic=0x9fa0
                # SYSFS_MAGIC
                dont_measure fsmagic=0x62656572
                # DEBUGFS_MAGIC
                dont_measure fsmagic=0x64626720
                # TMPFS_MAGIC
                dont_measure fsmagic=0x01021994
                # RAMFS_MAGIC
                dont_measure fsmagic=0x858458f6
                # SECURITYFS_MAGIC
                dont_measure fsmagic=0x73636673
                # SELINUX_MAGIC
                dont_measure fsmagic=0xf97cff8c
                # CGROUP_SUPER_MAGIC
                dont_measure fsmagic=0x27e0eb
                # OVERLAYFS_MAGIC
                # when containers are used we almost always want to ignore them
                dont_measure fsmagic=0x794c7630
                # MEASUREMENTS
                # This covers regular binary execution (e.g., running an ELF file with execve).
                measure func=BPRM_CHECK
                # Captures JIT-executed or interpreted code and shared libraries mapped into memory with executable permission.
                measure func=FILE_MMAP mask=MAY_EXEC
                # Tracks all kernel modules loaded by root, which is crucial for maintaining kernel integrity.
                measure func=MODULE_CHECK uid=0
                # Measures all files that are read, written, or appended to.
                measure func=FILE_CHECK mask=MAY_READ
                measure func=FILE_CHECK mask=MAY_WRITE
                measure func=FILE_CHECK mask=MAY_APPEND
   boot:
      - name: "Set Keylime config"
        files:
           - path: /var/lib/keylime/cv_ca/cacert.crt # This is the cert from the Keylime registrar/tenant server. The clients need to trust it.
             content: |
                -----BEGIN CERTIFICATE-----
                MIID8zCCAtugAwIBAgIBATANBgkqhkiG9w0BAQsFADBzMQswCQYDVQQGEwJVUzEm
                MCQGA1UEAwwdS2V5bGltZSBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkxCzAJBgNVBAgM
                Ak1BMRIwEAYDVQQHDAlMZXhpbmd0b24xDjAMBgNVBAoMBU1JVExMMQswCQYDVQQL
                DAI1MzAeFw0yNTA3MDQwODIxMThaFw0zNTA3MDIwODIxMThaMHMxCzAJBgNVBAYT
                AlVTMSYwJAYDVQQDDB1LZXlsaW1lIENlcnRpZmljYXRlIEF1dGhvcml0eTELMAkG
                A1UECAwCTUExEjAQBgNVBAcMCUxleGluZ3RvbjEOMAwGA1UECgwFTUlUTEwxCzAJ
                BgNVBAsMAjUzMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqdMRFikV
                w65U0B213Zscps3ODEXPkZgFFf5Uyv9Md9kV5zMSWk0Em/HTUUiixVz8o7+soK7f
                SZezKg8Je/Sy1eZlRLR7ijHQyHmFByMcHiBry8FhaHelP1bfUNVHY9PkTYX1i7Cb
                yXiSwD2x467Ao8KwZWNR01d9rDMwWSV73scddRt9hLaI8BWaTptpaC3tpQhvo4K9
                LrYsOxpgoFGyMU09Ds5BOqt5IaU3DkY2bfkSy6D9W4GVzk56u0RHevy6kTA6DARK
                wDYlo+z/mgylLZsxD+r5VwxLjoXT1e+M2T4H/F2T/FPh5BLNngXOfaJl0YP9amLM
                oopARJ04qKO5pwIDAQABo4GRMIGOMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYE
                FE3BrSsveBPSY5ct2MLvIobGDDtSMCsGA1UdHwQkMCIwIKAeoByGGmh0dHA6Ly9s
                b2NhbGhvc3Q6MzgwODAvY3JsMA4GA1UdDwEB/wQEAwIBBjAfBgNVHSMEGDAWgBRN
                wa0rL3gT0mOXLdjC7yKGxgw7UjANBgkqhkiG9w0BAQsFAAOCAQEACk//H5DDy/F6
                fqp7Ar3tWtTsrPiDmNo3P1w6u8dstuyfcfbHDi8HaN0YN2a837ya0eF4WzLIpo/b
                Ft4hNboGTIBQbcVsQ6sm6JY7ioI/eEiaHO0FeyIFfTy/oj00if5SZ1AT/cpumTCm
                NapygE7EZYzQU8VW1wLKZlOb0KvuBaLbfsfpFB05ZB1PYyxETTuZvs93vEs/huay
                HolE8pIl1eHE6fFcEeBtmnOGOMHHcITlmyjdzSuL/Z3aDmXxuQN5y/cyO2t3MQ24
                i100gwrCtRGLmJo4cTr/57/KO8PkSZaNhWuLOfzLggBMHL6uXUr2Q8FBgTc/hUaX
                AZTsa1FQAA==
                -----END CERTIFICATE-----
             permissions: 0644
           - path: /etc/keylime/agent.conf.d/10-config.conf
             content: |
                [agent]
                ip = '0.0.0.0' # This is the IP the agent will listen on, change if needed
                registrar_ip = '192.168.122.31' # change to the keylime remote attestation server IP
                uuid = '61388a67-baa4-4f2b-8221-d539b7b4d98b' # Generate an uuid with `uuidgen` or similar
             permissions: 0640
      - name: "Set keylime owner to /var/lib/keylime"
        commands:
           - chown -R keylime:keylime /var/lib/keylime
   network:
      - name: "Enable keylime_agent service" # This will request activation but does not ADD the node and starts attestation
        systemctl:
           enable:
              - keylime_agent
           start:
              - keylime_agent
```


Lets go a bit into detail of some of the options.

- `bind_mounts`: This is required for the keylime-agent to store the keys and certificates. It needs to be persisted across reboots.
- `extra_cmdline`: This is required to enable the IMA appraisal in the kernel. This is required for keylime to work if you expect to use runtime attestation and a custom IMA policy.
- `users`: We add the keylime user as the default keylime agent service will drop privileges to this user. Has to have the `tss` group as well.
- `/etc/ima/ima-policy`: This is the custom IMA policy that the kernel will use. The one provided is just a generic example.
- `/var/lib/keylime` ownership: The keylime agent will need to write to this directory. It is important to set the correct ownership. We do it at the end so all the written files are owned by the keylime user.
- `systemctl`: We want to enable and start the keylime_agent service so it starts on boot and is running.
- `/etc/keylime/agent.conf.d/10-config.conf`: This is the keylime agent configuration. Keylime agent provides a default config and we use this to override those default values. Minimal values that need configuring here are as follows:
  - `ip`: The IP address the agent will listen on. This should be set to `0.0.0.0` to listen on all interfaces or to the specific interface IP address if you know it on advance. Otherwise it will only listen on the loopback interface and won't be reachable from the outside.
  - `registrar_ip`: The IP address of the keylime registrar server. Otherwise the agent will not be able to communicate with the registrar.
  - `uuid`: The UUID of the agent. This is used to identify the agent in the registrar. This can be any UUID as long as it is unique in the registrar server. If you set it to 'generate' it will generate a random UUID for you but that’s not currently supported in Kairos. You can generate a UUID with `uuidgen` or similar tools.
  - `/var/lib/keylime/cv_ca/cacert.crt`: This is the CA certificate that the agent will use to verify the registrar server. This is required for the agent to be able to communicate with the registrar server securely. You can get this certificate from the Keylime registrar server.


With this values, building a derivative image and installing it should be enough to have the keylime agent running in Kairos.
Now you will need to add the agent to the Keylime registrar, as its currently activated but not added. You can do this from the Keylime tenant by running the following command:

```bash
$ keylime_tenant -c add --uuid UID_OF_AGENT --ip IP_OF_AGENT
....
2025-07-08 12:50:19.728 - keylime.tenant - INFO - Agent Info from Verifier (127.0.0.1:8881):
{"61388a67-baa4-4f2b-8221-d539b7b4d98b": {"operational_state": "Start", "v": null, "ip": "192.168.122.47", "port": 9002, "tpm_policy": "{\"mask\": \"0x0\"}", "meta_data": "{}", "has_mb_refstate": 0, "has_runtime_policy": 0, "accept_tpm_hash_algs": ["sha512", "sha384", "sha256"], "accept_tpm_encryption_algs": ["ecc", "rsa"], "accept_tpm_signing_algs": ["ecschnorr", "rsassa"], "hash_alg": "", "enc_alg": "", "sign_alg": "", "verifier_id": "default", "verifier_ip": "127.0.0.1", "verifier_port": 8881, "severity_level": null, "last_event_id": null, "attestation_count": 0, "last_received_quote": 0, "last_successful_attestation": 0}}
2025-07-08 12:50:19.728 - keylime.tenant - INFO - Agent 61388a67-baa4-4f2b-8221-d539b7b4d98b (192.168.122.47:9002) added to Verifier (127.0.0.1:8881) after 0 tries
```

Where `UID_OF_AGENT` is the UUID you set in the agent configuration and `IP_OF_AGENT` is the IP address of the agent.

> you can add `--cert default` to provision the node with the default certificates from the registrar, like the revocation certificat and such. This is very helpful so further steps down the line can be done without having to worry about the certificates.

Now from the tenant you can apply any policy you want to the agent. Note that the agent will start the attestation but there is no actual policy applied by default, so it will not fail the attestation process. It will just continue to run and report its state as valid.


## Using a runtime policy

As an example, you can use `keylime-policy` to create a runtime policy that will be applied to the agent. This policy can be as simple or as complex as you want, depending on your security requirements.


> A runtime policy in its most basic form is a set of “golden” cryptographic hashes of files’ un-tampered state or of keys
> that may be loaded onto keyrings for IMA verification


Exclude list that excludes everything except the `/usr/local/` and `/oem/` directories (perfect for Kairos :D):
```text
^/(?!oem/|usr/local/)
```

Or an exclude list that just excludes the directories that are not relevant for the runtime policy (files that keep changing, like logs, temporary files, etc.):
```text
^/var/log
.bash_history
^/sys
^/tmp
```


First from the node, we can copy the IMA ascii measure list and scp it to the Keylime tenant server:

```bash
$ scp /sys/kernel/security/ima/ascii_runtime_measurements root@TENANT_IP:/root/runtime_measurements
```

Then on the tenant server, we can generate a policy from this list using the `keylime-policy` command. This command will create a policy based on the measurements in the file we just copied.

```bash
$ keylime-policy create runtime --ima-measurement-list runtime_measurements -e excludelist.txt -o policy.json -v
INFO:keylime.config:Reading configuration from ['/etc/keylime/logging.conf']
2025-07-10 14:54:30.467 - keylime-policy - DEBUG - Measurement list is runtime_measurements
2025-07-10 14:54:30.468 - keylime-policy - DEBUG - Using digest algorithm 'sha256' obtained from the IMA measurement list
```


Now we can apply policy to the agent. You can use the `keylime_tenant` command to do this:

```bash
keylime_tenant --command update -u 61388a67-baa4-4f2b-8221-d539b7b4d98b -t 192.168.122.47 --runtime-policy policy.json 
INFO:keylime.config:Reading configuration from ['/etc/keylime/logging.conf']
2025-07-09 15:20:42.578 - keylime.config - INFO - Reading configuration from ['/etc/keylime/tenant.conf']
2025-07-09 15:20:42.578 - keylime.config - INFO - Applied configuration snippets from /etc/keylime/tenant.conf.d
2025-07-09 15:20:42.578 - keylime.tenant - INFO - Setting up client TLS...
2025-07-09 15:20:42.578 - keylime.tenant - INFO - Using default client_cert option for tenant
2025-07-09 15:20:42.578 - keylime.tenant - INFO - Using default client_key option for tenant
2025-07-09 15:20:42.578 - keylime.tenant - INFO - No value provided in client_key_password option for tenant, assuming the key is unencrypted
2025-07-09 15:20:42.579 - keylime.tenant - INFO - TLS is enabled.
2025-07-09 15:20:42.593 - keylime.cli.policies - INFO - TPM PCR Mask from policy is 0x0
2025-07-09 15:20:42.643 - keylime.tenant - INFO - Agent Info from Verifier (127.0.0.1:8881):
{"61388a67-baa4-4f2b-8221-d539b7b4d98b": {"operational_state": "Terminated", "v": null, "ip": "192.168.122.47", "port": 9002, "tpm_policy": "{\"mask\": \"0x0\"}", "meta_data": "{}", "has_mb_refstate": 0, "has_runtime_policy": 0, "accept_tpm_hash_algs": ["sha512", "sha384", "sha256"], "accept_tpm_encryption_algs": ["ecc", "rsa"], "accept_tpm_signing_algs": ["ecschnorr", "rsassa"], "hash_alg": "sha256", "enc_alg": "rsa", "sign_alg": "rsassa", "verifier_id": "default", "verifier_ip": "127.0.0.1", "verifier_port": 8881, "severity_level": null, "last_event_id": null, "attestation_count": 78, "last_received_quote": 1752066297, "last_successful_attestation": 1752066297}}
{'code': 200, 'status': 'Success', 'results': {'quote': 'r/1RDR4AYACIAC4hWOYdkG4M3v+tpIFyj2HOcpM/hnxJNsfc3rT9r4S5BABRkWnVQd1Rja3VPUjlBeUhyeWRPagAAAAAF6sI1AAAABgAAAAABICQBJQASAAAAAAABAAsDAAABACBYQwK8jVUDbMvZmLPw0tE7unP+d4sVDS8/pqmkT+gkag==:ABQACwEACQih/HZ/9JO3/hCwGmE6LSojc/nYQgskf4t/6OGB3ed/3kyysUMYrSXtw38FoZA+uu/7YTEaW+qWzf/KVPjOU5GJUB1B2StdSv570hTps7InxxDXhphIFH/KI5f1OdEK5c8o09b/IpZ/nGdYmp3GnowAivm+9y/0xarRA5GMUiVWdJT7LhZMQvxRXG/Yhb5zwoewpFecmbcNZ7/t0qpFfEpifwhP/yhp1wPTdUds774hlPhy5PAXFFYnTVcDn8TN0a8tBENtA/tewx3i6pxhIggW/miNyzgdKrQyIBCXgYr8U8zykk0DjTnWVeML3lzEj3CGZ1HTmu3l512juxv32A==:AQAAAAsAAwAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAgADOY31045T1AWJQ9mnWd1S0uBPHVWocFH54zRICCX9KnAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', 'hash_alg': 'sha256', 'enc_alg': 'rsa', 'sign_alg': 'rsassa', 'pubkey': '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm2R9EoaB0qhdKg+RbtJy\nYPbCM3CgxpnscdY0Eyv5WPfmkuJ9/9h/vWnqBDmxfXrZEhYlZIUrfyUjbNUyckz5\nXGgWpDZjNE+srxT7qwrUrCLpCvYSlHiLko6s4yinUKO0LPKQ1f41ATYd1JO3gXyD\nx8CabBqorSREz+KDO9uyUJyszL8lK0zLMAKXt/ZB3ZS76OmpmwBcQGpn0VtYHYl1\n584A4nStMIlNQET6QsQ70QIm5sTgaTGqrLoEHkQP7a1J9RfcHYrxqYg4dEgTEER7\nkPuLTKAGSdfqYzvOAIDqSsn3BxS1hC1TQ+ln6MprJSKG23VpMK1Q0PyTee7FvxVz\ntQIDAQAB\n-----END PUBLIC KEY-----\n'}}
2025-07-09 15:20:42.849 - keylime.tenant - WARNING - DANGER: EK cert checking is disabled and no additional checks on EKs have been specified with ek_check_script option for Agent 61388a67-baa4-4f2b-8221-d539b7b4d98b (192.168.122.47:9002). Keylime is not secure!!
2025-07-09 15:20:42.849 - keylime.tenant - INFO - Quote from Agent 61388a67-baa4-4f2b-8221-d539b7b4d98b (192.168.122.47:9002) validated
2025-07-09 15:20:43.268 - keylime.tenant - INFO - Agent Info from Verifier default (127.0.0.1:8881):
{"61388a67-baa4-4f2b-8221-d539b7b4d98b": {"operational_state": "Start", "v": null, "ip": "192.168.122.47", "port": 9002, "tpm_policy": "{\"mask\": \"0x400\"}", "meta_data": "{}", "has_mb_refstate": 0, "has_runtime_policy": 1, "accept_tpm_hash_algs": ["sha512", "sha384", "sha256"], "accept_tpm_encryption_algs": ["ecc", "rsa"], "accept_tpm_signing_algs": ["ecschnorr", "rsassa"], "hash_alg": "", "enc_alg": "", "sign_alg": "", "verifier_id": "default", "verifier_ip": "127.0.0.1", "verifier_port": 8881, "severity_level": null, "last_event_id": null, "attestation_count": 0, "last_received_quote": 0, "last_successful_attestation": 0}}
2025-07-09 15:20:43.268 - keylime.tenant - INFO - Agent 61388a67-baa4-4f2b-8221-d539b7b4d98b (192.168.122.47:9002) added to Verifier default (127.0.0.1:8881) after 0 tries
```
This will apply the runtime policy to the agent and the agent will start the attestation process. You can see this in the agent logs:

```bash
Jul 10 12:55:39 localhost keylime_agent[1551]:  INFO  keylime_agent                        > GET invoked from "192.168.122.31" with uri /v2.1/quotes/integrity?nonce=TMywGq9gEgYy8QaptsB1&mask=0x400&partial=1&ima_ml_entry=1739
Jul 10 12:55:39 localhost keylime_agent[1551]:  INFO  keylime_agent::quotes_handler        > GET integrity quote returning 200 response
Jul 10 12:55:41 localhost keylime_agent[1551]:  INFO  keylime_agent                        > GET invoked from "192.168.122.31" with uri /v2.1/quotes/integrity?nonce=eyI1bo2HpS081kM1FbnQ&mask=0x400&partial=1&ima_ml_entry=1739
Jul 10 12:55:42 localhost keylime_agent[1551]:  INFO  keylime_agent::quotes_handler        > GET integrity quote returning 200 response
Jul 10 12:55:44 localhost keylime_agent[1551]:  INFO  keylime_agent                        > GET invoked from "192.168.122.31" with uri /v2.1/quotes/integrity?nonce=3TStNCteiVm5NC0dCraW&mask=0x400&partial=1&ima_ml_entry=1739
Jul 10 12:55:44 localhost keylime_agent[1551]:  INFO  keylime_agent::quotes_handler        > GET integrity quote returning 200 response
```

You can also check on the verifier logs that the agent is in the correct state:

```bash
jul 10 14:57:06 keylime keylime_verifier[1410]: 2025-07-10 14:57:06.216 - keylime.tpm - INFO - Checking IMA measurement list on agent: 61388a67-baa4-4f2b-8221-d539b7b4d98b
jul 10 14:57:08 keylime keylime_verifier[1410]: 2025-07-10 14:57:08.449 - keylime.tpm - INFO - Checking IMA measurement list on agent: 61388a67-baa4-4f2b-8221-d539b7b4d98b
jul 10 14:57:10 keylime keylime_verifier[1410]: 2025-07-10 14:57:10.637 - keylime.tpm - INFO - Checking IMA measurement list on agent: 61388a67-baa4-4f2b-8221-d539b7b4d98b
jul 10 14:57:12 keylime keylime_verifier[1410]: 2025-07-10 14:57:12.854 - keylime.tpm - INFO - Checking IMA measurement list on agent: 61388a67-baa4-4f2b-8221-d539b7b4d98b
```

Now we can test the revocation of the agent once a file is modified. We will change the /oem/90_custom.yaml and change a value in there:

```bash
$ sed -i 's/reboot: true/reboot: false/' /oem/90_custom.yaml
```

Sure enough, in a few seconds the agent will be revoked and you can see this in the verifier logs:

```bash
jul 10 15:00:00 keylime keylime_verifier[1410]: 2025-07-10 15:00:00.941 - keylime.tpm - INFO - Checking IMA measurement list on agent: 61388a67-baa4-4f2b-8221-d539b7b4d98b
jul 10 15:00:03 keylime keylime_verifier[1410]: 2025-07-10 15:00:03.153 - keylime.tpm - INFO - Checking IMA measurement list on agent: 61388a67-baa4-4f2b-8221-d539b7b4d98b
jul 10 15:00:03 keylime keylime_verifier[1410]: 2025-07-10 15:00:03.153 - keylime.ima - WARNING - Hashes for file /oem/90_custom.yaml don't match 97356fb8edc035052bac594306d0fdcef99f28e42703acaafa8d7940868b60d0 not in ['046209cb4acb79d533a9c6a9845766d4f435bc059f45421ed6e1cceb9c2dcc2e']
jul 10 15:00:03 keylime keylime_verifier[1410]: 2025-07-10 15:00:03.153 - keylime.ima - ERROR - IMA ERRORS: Some entries couldn't be validated. Number of failures in modes: ImaNg 1.
jul 10 15:00:03 keylime keylime_verifier[1410]: 2025-07-10 15:00:03.187 - keylime.verifier - WARNING - Agent 61388a67-baa4-4f2b-8221-d539b7b4d98b failed, stopping polling
```

You can also see this in the agent logs:

```bash
Jul 10 13:00:02 localhost keylime_agent[1551]:  INFO  keylime_agent                        > GET invoked from "192.168.122.31" with uri /v2.1/quotes/integrity?nonce=9Ovk0YVjEp2bXollI76m&mask=0x400&partial=1&ima_ml_entry=1746
Jul 10 13:00:02 localhost keylime_agent[1551]:  INFO  keylime_agent::quotes_handler        > GET integrity quote returning 200 response
Jul 10 13:00:02 localhost keylime_agent[1551]:  INFO  keylime_agent                        > POST invoked from "192.168.122.31" with uri /v2.1/notifications/revocation
Jul 10 13:00:02 localhost keylime_agent[1551]:  INFO  keylime_agent::notifications_handler > Received revocation
Jul 10 13:00:02 localhost keylime_agent[1551]:  WARN  keylime_agent::revocation            > Revocation certificate not yet available
```

## Using a TPM policy instead

As an example, we add a policy that will only allow the agent to boot if the PCR 15 is equal to a specific value (in this case empty value as we haven't measured anything into PCR15):

```bash
$ keylime_tenant -c update --uuid UID_OF_AGENT -t IP_OF_AGENT  --tpm_policy '{"15":["0000000000000000000000000000000000000000","0000000000000000000000000000000000000000000000000000000000000000","000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"]}'
```

Then the agent will start the attestation process, which you can see both in the agent logs and in the verifier logs. As well as checking with the tenant that the agent is in the correct state.

Then to test the revocation you can extend the PCR15 manually:

```bash
$ tpm2_pcrextend 15:sha256=f1d2d2f924e986ac86fdf7b36c94bcdf32beec15324234324234234333333333
```

Then the verifier will see that the agent is not in the correct state and will revoke it. You can see this in the verifier logs:

```bash
2025-07-10 15:05:15.296 - keylime.tenant - INFO - Agent Info from Verifier (127.0.0.1:8881):
{"61388a67-baa4-4f2b-8221-d539b7b4d98b": {"operational_state": "Invalid Quote", "v": null, "ip": "192.168.122.47", "port": 9002, "tpm_policy": "{\"15\": [\"0000000000000000000000000000000000000000\", \"0000000000000000000000000000000000000000000000000000000000000000\", \"000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000\"], \"mask\": \"0x8000\"}", "meta_data": "{}", "has_mb_refstate": 0, "has_runtime_policy": 0, "accept_tpm_hash_algs": ["sha512", "sha384", "sha256"], "accept_tpm_encryption_algs": ["ecc", "rsa"], "accept_tpm_signing_algs": ["ecschnorr", "rsassa"], "hash_alg": "sha256", "enc_alg": "rsa", "sign_alg": "rsassa", "verifier_id": "default", "verifier_ip": "127.0.0.1", "verifier_port": 8881, "severity_level": 6, "last_event_id": "pcr_validation.invalid_pcr_15", "attestation_count": 53, "last_received_quote": 1752152713, "last_successful_attestation": 1752152711}}
```

You will also see on the agent logs that it has been revoked:

```bash
Jul 10 13:05:13 localhost keylime_agent[1741]:  INFO  keylime_agent::quotes_handler  > GET integrity quote returning 200 response
Jul 10 13:05:13 localhost keylime_agent[1741]:  INFO  keylime_agent                  > POST invoked from "192.168.122.31" with uri /v2.1/notifications/revocation
Jul 10 13:05:13 localhost keylime_agent[1741]:  INFO  keylime_agent::notifications_handler > Received revocation
Jul 10 13:05:13 localhost keylime_agent[1741]:  WARN  keylime_agent::revocation            > Revocation certificate not yet available

```



## Using revocation keys


In order to make the agent revocation process more secure, when registering the agent in the Keylime tenant, you need to pass a `--cert YOURCERT|default` option when adding the node. This will create a secure payload with the proper keys and scripts to be used for revocation and deliver it to the node. The agent will then use this payload to revoke itself when it detects a policy violation.

```bash
Jul 11 07:22:12 localhost keylime_agent[1756]:  DEBUG keylime_agent::keys_handler    > Sent RunPayload message to payloads worker
Jul 11 07:22:12 localhost keylime_agent[1756]:  DEBUG keylime_agent::keys_handler    > Sent RunPayload message to payloads worker
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > Successfully decrypted payload
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > Wrote payload decryption key to "/var/lib/keylime/secure/unzipped/derived_tci_key"
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > Wrote decrypted payload to "/var/lib/keylime/secure/unzipped/decrypted_payload"
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > Unzipping payload decrypted_payload to "/var/lib/keylime/secure/unzipped"
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > Payload init script indicated: autorun.sh
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > Running script: "/var/lib/keylime/secure/unzipped/autorun.sh"
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > No payload script autorun.sh found in /var/lib/keylime/secure/unzipped
Jul 11 07:22:12 localhost keylime_agent[1756]:  DEBUG keylime_agent::payloads        > Sending PayloadDecrypted message to revocation worker
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::payloads        > Successfully executed encrypted payload
Jul 11 07:22:12 localhost keylime_agent[1756]:  INFO  keylime_agent::revocation      > Loading the revocation certificate from /var/lib/keylime/secure/unzipped/RevocationNotifier-cert.crt
```

The agent will use that certificate to confirm that the revocation order came from the Keylime tenant and not from an attacker. The agent will also use the revocation script to revoke itself, if any was configured.

```bash
Jul 11 07:32:07 localhost keylime_agent[1756]:  INFO  keylime_agent::notifications_handler > Received revocation
Jul 11 07:32:07 localhost keylime_agent[1756]:  DEBUG keylime_agent::revocation            > Revocation signature validated for revocation: {"agent_id":"61388a67-baa4-4f2b-8221-d539b7b4d98b","context":"{\"message\": \"Hash not found in runtime policy\", \"got\": \"97356fb8edc035052bac594306d0fdcef99f28e42703acaafa8d7940868b60d0\", \"expected\": [\"046209cb4acb79d533a9c6a9845766d4f435bc059f45421ed6e1cceb9c2dcc2e\"]}","event_id":"ima.validation.ima-ng.runtime_policy_hash","event_time":"Fri Jul 11 09:32:08 2025","ip":"192.168.122.47","meta_data":"{\"cert_serial\": 4, \"subject\": \"OU=53,O=MITLL,L=Lexington,ST=MA,CN=61388a67-baa4-4f2b-8221-d539b7b4d98b,C=US\"}","port":9002,"severity_label":"emergency","tpm_policy":"{\"mask\": \"0x400\"}","type":"revocation"}
```


This is a very basic example of how to use keylime in Kairos. You can extend this to use more complex policies and more complex attestation mechanisms.
As Keylime is a very flexible tool, you can use it in many different ways to secure your infrastructure. Here are some more links to the Keylime documentation to get you started:
- [Keylime documentation](https://keylime-docs.readthedocs.io/en/latest/)
- [Red Hat Keylime documentation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_ensuring-system-integrity-with-keylime_security-hardening)
- [Suse Keylime documentation](https://documentation.suse.com/sle-micro/6.0/html/Micro-keylime/index.html)