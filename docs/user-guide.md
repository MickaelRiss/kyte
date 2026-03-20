# Kyte User Guide

Kyte is a desktop application that protects your cryptocurrency seed phrase by eliminating its single point of failure. Instead of storing your seed in one place. Kyte uses **Shamir secret sharing** to split it into multiple fragments, only a subset of which is needed to recover the original. Guardian users can add an extra layer of **AES-256-GCM encryption** with a passphrase before splitting, so that even recovering enough fragments is not sufficient without the passphrase. Everything runs locally on your machine, no accounts, no cloud sync, no data ever leaves your device during encryption or decryption. Kyte provides the tools, you own the information, and we keep the zero-knowledge philosophy. Because when it comes to your recovery phrase, total control is the only standard that matters.

### The Problem with Traditional Seed Storage

Most crypto users store their seed phrase in one of these ways:

- Written on paper in a safe
- Saved in a password manager
- Engraved on a metal plate
- Stored in an encrypted file

Each approach has a fundamental weakness: a **single point of failure**. One theft, one fire, one forgotten password and access is permanently lost.

---

### How Kyte Works

#### Free Tier (Community Mode)

In Community mode, Kyte protects your seed using Shamir secret sharing alone, no passphrase is involved.

{% stepper %}
{% step %}

#### Enter Your Seed Phrase

Type or paste your 12–24 word BIP39 seed phrase into the input field.
{% endstep %}

{% step %}

#### Kyte Validates It

The seed is checked against the BIP39 English wordlist and checksum. Invalid seeds are rejected before anything is stored or split.
{% endstep %}

{% step %}

#### Shamir 2-of-3 Split

Your seed is split into exactly 3 fragments using a 2-of-3 threshold. Any 2 of the 3 fragments can reconstruct the original.
{% endstep %}

{% step %}

#### Download Your 3 QR Codes

Three labeled QR code cards (A, B, C) are generated. Print and distribute them separately.
{% endstep %}
{% endstepper %}

{% hint style="info" %}
No passphrase is used in free mode. Shamir secret sharing alone protects your seed. An attacker must obtain at least 2 fragments to recover anything.
{% endhint %}

#### Guardian Mode

{% stepper %}
{% step %}

#### Enter Your Seed + Passphrase

You provide your BIP39 seed phrase. Guardian users can also add an optional passphrase for AES encryption.
{% endstep %}

{% step %}

#### Validation & Normalization

Kyte validates the seed against the BIP39 standard and normalizes it (extra spaces trimmed, uppercase lowercased).
{% endstep %}

{% step %}

#### AES-256-GCM Encryption (Guardian with passphrase only)

If a passphrase is provided, the seed is encrypted using AES-256-GCM with a PBKDF2-SHA512 derived key (210,000 iterations, 64-byte random salt). The passphrase is never stored.
{% endstep %}

{% step %}

#### Telegram Alert

You can also enable Telegram Recovery Alerts during encryption. To prevent any unauthorized modification or false alarms by third parties, your bot configuration is stored exclusively on the local machine used for encryption. In the event of a recovery or a failed attempt, an immediate alert is sent to your trusted contacts, including the decryption IP address, allowing them to follow your instructions and alert the authorities if necessary. [See Telegram Recovery Alerts for setup instructions](#telegram-recovery-alerts).
{% endstep %}

{% step %}

#### Shamir Secret Sharing Split

The data is split into N fragments using Shamir secret sharing. You configure how many fragments to create and the minimum threshold required to reconstruct the secret.
{% endstep %}

{% step %}

#### Output: QR Code Fragments

Each fragment is displayed as a labeled QR code card (A, B, C…) ready to print and distribute.
{% endstep %}
{% endstepper %}

{% hint style="info" %}
**Information-theoretic security:** A single fragment reveals absolutely zero information about your seed. This is not just computationally hard to break, it is mathematically impossible. You need at least the threshold number of fragments to learn anything.

This means:

- Losing one fragment does not lock you out (as long as you still have the threshold)
- An attacker finding one fragment gains nothing
- You can distribute fragments across different locations and trusted people
  {% endhint %}

---

### Free vs Guardian Tiers

| Feature                  | Free         | Guardian            |
| ------------------------ | ------------ | ------------------- |
| Encryptions              | 1            | 10                  |
| Passphrase (AES-256-GCM) | No           | Yes                 |
| Fragment count           | Fixed 3      | 3–10 (configurable) |
| Recovery threshold       | Fixed 2-of-3 | Configurable 2–N    |
| Telegram recovery alerts | No           | Yes                 |
| License key required     | No           | Yes                 |

---

### Recovering Your Seed

{% stepper %}
{% step %}

#### Collect Your Fragments

Gather at least the threshold number of fragments (e.g. any 2 of 3 for the default configuration). Scan the QR codes (you can do it on your [desktop](https://qrscanner.net/)) or copy the fragment text strings.
{% endstep %}

{% step %}

#### Paste Fragments into the App

Open the Decrypt tab and paste each fragment string into its own input field. The app will display a hint like "Provide any 2 of 3 fragments" based on the first fragment you enter.
{% endstep %}

{% step %}

#### Enter Passphrase (if used)

If you encrypted with a passphrase, enter it now. If you used Community mode or Guardian mode without a passphrase, leave this field empty.
{% endstep %}

{% step %}

#### Recovered Seed Appears

Your original seed phrase is displayed. Copy it immediately, it will be automatically cleared from the screen after 30 seconds.
{% endstep %}
{% endstepper %}

{% hint style="info" %}
The recovered seed auto-clears after **30 seconds** as a security precaution. Make sure you are ready to use or store it before starting recovery.
{% endhint %}

<details>

<summary>Recovery Scenarios (default 2-of-3)</summary>

To recover your seed, combine any 2 of the 3 fragments:

- Fragment A + Fragment B → ✅ Works
- Fragment A + Fragment C → ✅ Works
- Fragment B + Fragment C → ✅ Works

Only 1 fragment alone → ❌ Not enough

</details>

---

### Fragment Distribution Strategy

Each fragment should be stored separately in a different physical location or with a different trusted person. Never store two fragments together, that would recreate a single point of failure.

![](https://content.gitbook.com/content/qdKwIqI5QjJ4CWc20NME/blobs/9NokxWN2s4WCcrAAstmW/1*zQoSYKKPp7ImmCWJr6sppQ.png)

Each fragment label (A, B, C…) corresponds to a QR code card in the app. The label printed on the card tells you which fragment it is.

---

### Guardian Tier Features

#### Passphrase Encryption

Guardian mode adds AES-256-GCM encryption on top of Shamir splitting. Your seed is encrypted before it is split, so fragments alone are not enough to recover the original.

**Recovery requires:** any `threshold` fragments **+ the passphrase you used during encryption.**

{% hint style="warning" %}
**If you lose your passphrase, your fragments alone cannot recover your seed.** There is no passphrase reset or recovery mechanism. Store your passphrase safely and separately from your fragments.
{% endhint %}

Technical details:

- AES-256-GCM authenticated encryption
- PBKDF2-SHA512 key derivation (210,000 iterations - OWASP 2023 recommendation)
- 64-byte random salt per encryption
- 16-byte random IV per encryption

---

#### Custom M-of-N Configuration

Guardian users can configure the total number of fragments and the recovery threshold independently.

| Configuration | Fragments required | Fragments you can lose | Use case                             |
| ------------- | ------------------ | ---------------------- | ------------------------------------ |
| 2-of-3        | 2                  | 1                      | Default - simple personal use        |
| 3-of-5        | 3                  | 2                      | Personal use with extra redundancy   |
| 5-of-10       | 5                  | 5                      | Institutional or multi-party custody |
| 2-of-4        | 2                  | 2                      | Balance of security and flexibility  |

**Higher threshold** = an attacker needs more fragments to reconstruct your seed (more secure).

**Higher total fragments** = you can afford to lose more fragments without losing access (more redundant).

Choose based on how many trusted locations or people you have available, and how concerned you are about an attacker obtaining multiple fragments.

---

#### Telegram Recovery Alerts

Guardian users can receive an automatic Telegram message every time their seed is recovered. This acts as a tamper alert, if you get a notification you did not initiate, you know your fragments may be compromised.

**Setup**

- Enable the **"Telegram notification on recovery"** toggle in the encrypt form.
- Enter your **bot token** (format: `12345:ABCdef...`, obtained from @BotFather on Telegram).&#x20;
  1. Open Telegram application then search for `@BotFather`
  2. Click Start then type `/newbot` and hit Send
  3. Follow the instruction until we get message with your bot token (`63xxxxxx71:AAFoxxxxn0hwA-2TVSxxxNf4c`) like so:

```
Done! Congratulations on your new bot. You will find it at t.me/new_bot.
You can now add a description....
Use this token to access the HTTP API:
63xxxxxx71:AAFoxxxxn0hwA-2TVSxxxNf4c
Keep your token secure and store it safely, it can be used by anyone to control your bot.
For a description of the Bot API, see this page: https://core.telegram.org/bots/api
```

- Search and open your new Telegram bot on your Telegram app
- Click Start or send a message
- Open this URL in a browser `https://api.telegram.org/bot{our_bot_token}/getUpdates`
  - `https://api.telegram.org/bot63xxxxxx71:AAFoxxxxn0hwA-2TVSxxxNf4c/getUpdates`&#x20;
- You should see something like :&#x20;

```
{
  "ok": true,
  "result": [
    {
      "update_id": 83xxxxx35,
      "message": {
        "message_id": 2643,
        "from": {...},
        "chat": {
          "id": 21xxxxx38,
          "first_name": "...",
          "last_name": "...",
          "username": "@username",
          "type": "private"
        },
        "date": 1703062972,
        "text": "/start"
      }
    }
  ]
}
```

- Check the value of `result.0.message.chat.id`, and here is your Chat ID: `21xxxxx38`
- Enter your **bot token** (`63xxxxxx71:AAFoxxxxn0hwA-2TVSxxxNf4c`) and **chat ID** (`21xxxxx38`) in Kyte Application.
- Optionally click **"Test Alert"** to verify your configuration before encrypting. The app shows sending / success / error states.
- Click Encrypt. Your alert config is stored encrypted on your device.

**What the Alerts Contain**

**On successful recovery**, you receive a Telegram message with:

- Approximate city, region, and country (based on IP address)
- ISP / network provider name
- Google Maps link for the approximate coordinates
- UTC timestamp of the recovery event
- A disclaimer that the location is IP-based, not GPS

**On failed recovery attempt**, you receive an urgent Telegram message with:

- All the same location and timestamp information
- The reason for the failure (e.g. wrong passphrase, mismatched fragments)
- A warning to take immediate action if the attempt wasn't yours

**Important Notes**

{% hint style="info" %}
**Alerts are asynchronous.** The Telegram message fires in the background. On successful recovery, your seed appears in the app immediately with no delay. On failed recovery, the error is still shown to the person attempting decryption.

**Location is approximate.** The geolocation is IP-based and may reflect your ISP's routing center rather than your exact physical location. It is useful as an indicator, not a precise tracker.
{% endhint %}

---

### Seed Phrase Requirements

Kyte validates seeds against the BIP39 standard:

- **12, 15, 18, 21, or 24 words** - other lengths are rejected
- **BIP39 English wordlist** - all words must come from the standard 2048-word list
- **Valid checksum** - the last word encodes verification data; an invalid checksum is rejected

Kyte also normalizes input automatically:

- Extra spaces are trimmed
- Uppercase letters are converted to lowercase

You do not need to clean up your input manually.

---

### Security Highlights

- **All operations run locally.** Encryption and decryption never require an internet connection. No seed or fragment data leaves your device.
- **Your passphrase is never stored.** Only you know it. If lost, it cannot be recovered.
- **License key and Telegram config are stored encrypted** on your device using your OS's secure storage (Electron `safeStorage`). They are never transmitted to any server.
- **A unique backup ID ties all fragments together.** Each set of fragments gets a random backup ID embedded at encryption time. If you accidentally mix fragments from two different encryption runs, Kyte detects the mismatch and rejects the combination.
- **The recovered seed auto-clears after 30 seconds** to limit the window of exposure if you step away from your screen.

---

### Getting Started

{% stepper %}
{% step %}

#### Download

Download the Kyte desktop application for your platform (macOS, Windows, or Linux).
{% endstep %}

{% step %}

#### Enter Your Seed Phrase

Open Kyte, go to the Encrypt tab, and enter your seed phrase. Guardian users can also add a passphrase and configure M-of-N settings.
{% endstep %}

{% step %}

#### Distribute Your QR Code Fragments

Print the generated QR code cards and store each fragment in a separate, secure location. Never keep two fragments together.
{% endstep %}
{% endstepper %}

Your crypto security should not depend on a single point of failure. With Kyte, it does not have to.

Light, resilient, and elegant in its simplicity. That's Kyte.
