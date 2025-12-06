---
authors:
- mauro-morales
slug: kairos-doorbell
tags:
- kairos
title: How I Automated My Doorbell with Kairos (and You Can Too)
---

Picture this: You’re deep in focus, coding away, and the doorbell rings. Except… you never hear it. The mailman leaves, and now your package is on an adventure you didn't plan for. That’s exactly what happened to me, so I did what any geek would do—turn my dumb doorbell into a smart one using Kairos.

:::warning Disclaimer

The information provided in this post is for educational and informational purposes only. I am not a professional electrician, engineer, or security expert. Any modifications to electrical systems, including doorbells, carry inherent risks, such as damage to property, malfunction, or personal injury. If you choose to follow the steps outlined here, you do so at your own risk. Always take proper safety precautions, consult professionals when necessary, and ensure compliance with local laws and regulations. I cannot be held liable for any consequences resulting from the use or misuse of the information in this post.

:::

## Requirements

For this setup I used the following hardware

- Honeywell D117 doorbell using the D780 transformer
- Finder 40.52.8.006.0000 6V AC relay and 95.85.3 relay socket
- Doorbell cable and male to female jumper cables
- Raspberry Pi 4B 8G with its power adapter and an SD card and a RJ45 cable to connect it to the internet

And on the software side of things all you need is docker, but you can also use other container engine if you have experience building and running images there.

## Hardware

My doorbell is a Honeywell D117, aka Ding Dong (gotta love the name). It’s using the D780 transformer with the following connection (diagram on the left of the picture).

![Diagram of a Honeywell D117 doorbell with a D780 transformer](https://github.com/user-attachments/assets/2fbdd893-dba4-496e-9bbc-6450418d5eb4)


The transformer takes 220V and produces an 8V current

![Transformer D780](https://github.com/user-attachments/assets/da048846-16f8-41ca-8673-1467a1028fa3)

We can now use a relay to detect when the circuit is closed. I wasn’t able to find an 8V AC relay, so I tried with a 12V AC and a 6V AC. The 12V one didn't work but the 6V one did. I cannot tell how bad an idea this is so only try this at your own risk. The brand is FINDER and the part number is `40.52.8.006.0000`, I bought it from [Reichelt](https://www.reichelt.de/de/de/shop/produkt/steckrelais_2x_um_250v_8a_6vac_rm_5_0mm-271335) and got it sent to Belgium

Connect `A1` and `A2` to `0F` and `T3` respectively.

![Doorbell Wiring](https://github.com/user-attachments/assets/f1afd596-60ef-4181-92c3-250af52693a3)

We will use the always open circuit on the other side of the relay so connect a male to female cable on 11 and 14 which will go to the Raspberry Pi.

![Relay Wiring](https://github.com/user-attachments/assets/8aac2983-3208-4792-a14e-713afea7bd0d)

I connected it to [GPIO 23](https://pinout.xyz/pinout/pin16_gpio23/) and [Ground (14)](https://pinout.xyz/pinout/ground)

![RPi Wiring](https://github.com/user-attachments/assets/c10b4573-dc3d-478c-9853-07abbafaef8c)

## Software

### System Image

Now that all the cabling is done, let’s prepare the software. First I’m going to prepare the image for the SD card. For that I’ll use Kairos because it will make it easier for me to do upgrades in the future and because it’s immutable so I can have my infrastructure as code easily. All I have to do is build a raw image which I can then copy to the SD card.

```bash
docker run --rm --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $PWD/build/:/output \
  quay.io/kairos/auroraboot:latest \
  --debug \
  --set "disable_http_server=true" \
  --set "disable_netboot=true" \
  --set "container_image=quay.io/kairos/opensuse:leap-15.6-standard-arm64-rpi4-v3.3.1-k3sv1.32.1-k3s1" \
  --set "state_dir=/output" \
  --set "disk.raw=true"
```

There’s a lot in this command, which you can learn in the Kairos documentation but the one important thing to know is that I’m consuming the Kairos image that is specially built for Raspberry Pi 4 and that it contains the K3s Kubernetes distribution in it so I can deploy my script via Kubernetes and leave the base image unchanged.

If everything is successful you should get the image `build/kairos-opensuse-leap-15.6-standard-arm64-rpi4-v3.3.1-k3s1.32.1.raw` so let’s copy it into the SD card, I’m on Linux so I can run the following

```bash
sudo dd if=./build/kairos-opensuse-leap-15.6-standard-arm64-rpi4-v3.3.1-k3s1.32.1.raw \
  of=/dev/mmblk0 \
  oflag=sync \
  status=progress \
  bs=10MB
```

Once it finishes copying, you can insert it on the Raspberry Pi and boot it. It will do an initial boot to setup the system and reboot on its own. In the meantime let’s prepare the software we are going to deploy.

### Telegram Bot

I will be using a telegram bot to send the messages. This way anyone in the family can subscribe to it and mute it if they want. If you prefer a different solution just adapt the Python script in the next section.

1. Open Telegram and search for BotFather.
2. Type /newbot and follow the steps to create a bot.
3. Copy the API token that BotFather gives you.
4. Interact with your bot by sending any message
5. Extract the Chat ID by going to a browser using the api token you got in one of the previous steps https://api.telegram.org/botYOUR_API_TOKEN/getUpdates

### Python Script

This script will detect when there’s a signal in GPIO 23, write a log and send a Telegram message

```python
import os
import lgpio as GPIO
import time
import requests
from datetime import datetime

# Read environment variables
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

# GPIO Setup
GPIO_PIN = 23
h = GPIO.gpiochip_open(0)
GPIO.gpio_claim_input(h, GPIO_PIN, GPIO.SET_PULL_UP)

def send_telegram_message(message):
    if not BOT_TOKEN or not CHAT_ID:
        print("❌ Error: Missing environment variables for Telegram bot.")
        return
    url = f"<https://api.telegram.org/bot{BOT_TOKEN}/sendMessage>"
    payload = {"chat_id": CHAT_ID, "text": message}
    requests.post(url, json=payload)

print("🚀 Doorbell monitor started...")
while True:
    if GPIO.gpio_read(h, GPIO_PIN) == 0:  # Button pressed
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"🚪 Doorbell pressed at {timestamp}!"
        print(f"[{timestamp}] 🔔 {message}")
        send_telegram_message(message)
        time.sleep(2)  # Avoid spamming messages
    time.sleep(0.1)
```

### Dockerfile

We won’t run the script directly on the Raspberry Pi, it will be running in a Docker container. This is very useful when having the underlying system be immutable because I can still iterate without having to rebuild and burn a new SD card and restart the system. Instead all I have to do is install the packages I need in this container and run it in privilege mode. This of course can open some security risks, but again, this is just for learning purposes and for fun.

```dockerfile
# Use a lightweight Python base image for Raspberry Pi (ARM)
FROM python:3.9-slim

# Install system dependencies
RUN apt update && apt install -y python3-dev gcc

RUN pip install lgpio requests

# Set the working directory inside the container
WORKDIR /app

# Copy the Python script into the container
COPY doorbell.py /app/doorbell.py

# Set the script to run on startup
CMD ["python3", "/app/doorbell.py"]
```

Since the image is going to be running on the Raspberry Pi but I’m going to build it on an AMD platform, then I need to cross-compile. Use any tag you prefer, just keep in mind it is the same tag you have to use in the deployment in the next section

```bash
docker buildx build --platform=linux/arm64 \
  -t quay.io/mauromorales/doorbell:telegram-v1 \
  .
```

And publish it to a repository, I’m using Quay but you can use any repo you prefer

```bash
docker push quay.io/mauromorales/doorbell:telegram-v1
```

Yes that image is public and will remain static, but I’d recommend you build your own instead of using mine because at any moment I might decide to remove it.

### Kubernetes

Last piece of the puzzle is the Kubernetes deployment. Let’s log into our Kairos system with user `kairos` and password `kairos`

```bash
ssh kairos@IP
```

Switch to root

```
sudo -i
```

We want to create some secrets and pass them as environment variables in the container. Take the telegram bot token and chat id and encode them. For example if my Chat ID is `1234567890` then I’d do as follows:

```bash
echo -n "1234567890" | base64
```

do the same with the bot token, e.g. if my bot token was `999999999:FooooooBaaaaaaaaR` then I’d do

```bash
echo -n "999999999:FooooooBaaaaaaaaR" | base64
```

and copy them in a file called `telegram-secrets.yaml` and add the following content (remember to replace with your actual encoded values). Yes Kairos is immutable in some areas but the home directory is writable.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: telegram-secrets
type: Opaque
data:
  bot_token: OTk5OTk5OTk5OkZvb29vb29CYWFhYWFhYWFS
  chat_id: MTIzNDU2Nzg5MA==
```

Save the file and apply it

```bash
kubectl apply -f telegram-secret.yaml
```

Now we create a `deployment.yaml` file to connect everything together

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rpi-doorbell
spec:
  replicas: 1
  selector:
    matchLabels:
      app: doorbell
  template:
    metadata:
      labels:
        app: doorbell
    spec:
      containers:
      - name: doorbell
        image: quay.io/mauromorales/doorbell:telegram-v1
        imagePullPolicy: Always   # Forces Kubernetes to always pull the latest image
        securityContext:
          privileged: true  # Allows access to GPIO hardware
        resources:
          limits:
            memory: "128Mi"
            cpu: "100m"
        env:
          - name: TELEGRAM_BOT_TOKEN
            valueFrom:
              secretKeyRef:
                name: telegram-secrets
                key: bot_token
          - name: TELEGRAM_CHAT_ID
            valueFrom:
              secretKeyRef:
                name: telegram-secrets
                key: chat_id
```

And apply it

```bash
kubectl apply -f deployment.yaml
```

If everything went as expected, you should see your pod running

```
localhost:~ # kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
rpi-doorbell-67c78c5969-s6pw8   1/1     Running   0          20h
```

And you can get logs from that pod tracking every time someone pressed your doorbell in addition to sending the Telegram message

```
localhost:~ # kubectl logs rpi-doorbell-67c78c5969-s6pw8
🚀 Doorbell monitor started...
[2025-03-05 13:51:34] 🔔 🚪 Doorbell pressed at 2025-03-05 13:51:34!
[2025-03-05 15:41:25] 🔔 🚪 Doorbell pressed at 2025-03-05 15:41:25!
[2025-03-05 15:42:13] 🔔 🚪 Doorbell pressed at 2025-03-05 15:42:13!
[2025-03-05 18:28:26] 🔔 🚪 Doorbell pressed at 2025-03-05 18:28:26!
[2025-03-06 09:59:18] 🔔 🚪 Doorbell pressed at 2025-03-06 09:59:18!
```

## Conclusion

With this setup me and my partner can subscribe to the Telegram Bot and get notifications to our phones. I can also mute the bot if I’m in a meeting and don’t want to be disturbed. I could extend the system to not notify at certain hours of the day but still keep logs. If I’m not happy with Telegram then I can connect it to a different system. Whenever there’s a new version of Kairos I can upgrade the system remotely via the command line or through Kubernetes. If you have a similar setup but don’t want to buy a smart doorbell just yet, I can only recommend this setup.

![Telegram Bot](https://github.com/user-attachments/assets/c86d85e4-86b5-465d-bf1a-83a8850916bc)
