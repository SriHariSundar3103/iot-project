# 🤖 Arduino IDE Setup for ESP32 RFID Module

## ✅ Fixed Errors

The ESP32 code errors were caused by **missing Arduino libraries**. Follow this guide to install them.

---

## 📦 Step 1: Install Required Libraries

### Method 1: Using Arduino IDE Library Manager (Recommended)

1. **Open Arduino IDE**
2. Go to **Sketch → Include Library → Manage Libraries**
3. Search for and install these libraries:

   | Library         | Author          | Version       |
   | --------------- | --------------- | ------------- |
   | **MFRC522**     | GithubCommunity | Latest        |
   | **ArduinoJson** | Benoit Blanchon | 7.x or higher |

4. Click **Install** for each library

### Method 2: Manual Installation

If libraries don't appear in the library manager:

1. Download from GitHub:
   - MFRC522: https://github.com/miguelbalboa/rfid
   - ArduinoJson: https://github.com/bblanchon/ArduinoJson

2. Extract to your Arduino libraries folder:
   - **Windows**: `Documents\Arduino\libraries\`
   - **Linux**: `~/Arduino/libraries/`
   - **macOS**: `~/Documents/Arduino/libraries/`

3. Restart Arduino IDE

---

## 🎯 Step 2: Configure Arduino IDE for ESP32

1. **Add ESP32 Board Support**:
   - Go to **File → Preferences**
   - In "Additional Board Manager URLs", add:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Click **OK**

2. **Install ESP32 Board**:
   - Go to **Tools → Board → Boards Manager**
   - Search for "ESP32"
   - Install "esp32 by Espressif Systems" (latest version)

3. **Select Your Board**:
   - Go to **Tools → Board → ESP32 Arduino**
   - Select "ESP32 Dev Module"

4. **Configure Settings**:
   - **Port**: Select your COM port (e.g., COM3)
   - **Upload Speed**: 921600
   - **Flash Frequency**: 80MHz
   - **CPU Frequency**: 240MHz
   - **Core Debug Level**: Verbose

---

## 📝 Step 3: Verify Installation

1. Open the ESP32 sketch (`esp32_main.ino`)
2. Click **Sketch → Verify/Compile**
3. If successful, you should see:

   ```
   ✓ Sketch uses 123456 bytes (~45%)
   ```

4. If you still see errors:
   - **Cannot find SPI.h**: ESP32 board package not installed
   - **Cannot find MFRC522.h**: Library not installed
   - **Cannot find ArduinoJson.h**: ArduinoJson library not installed

---

## 🔌 Step 4: Hardware Connection Checklist

Verify these connections before uploading:

| RC522 Pin   | ESP32 GPIO | Function    |
| ----------- | ---------- | ----------- |
| RST         | GPIO4      | Reset       |
| SPI_CS (SS) | GPIO5      | Chip Select |
| MOSI        | GPIO23     | Data Out    |
| MISO        | GPIO19     | Data In     |
| SCK         | GPIO18     | Clock       |
| GND         | GND        | Ground      |
| 3.3V        | 3V3        | Power       |

| Other Pins | ESP32 GPIO |
| ---------- | ---------- |
| LED        | GPIO2      |
| Buzzer     | GPIO25     |

---

## 🚀 Step 5: Upload Code to ESP32

1. Before uploading, edit the WiFi credentials in the sketch:

   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverIP = "192.168.1.100";  // Your backend server IP
   ```

2. Click **Sketch → Upload** (or Ctrl+U)

3. Monitor output in **Tools → Serial Monitor** (115200 baud):
   ```
   Connected to WiFi: YOUR_WIFI_SSID
   IP address: 192.168.x.x
   Waiting for RFID cards...
   ```

---

## 🐛 Troubleshooting

### Error: "cannot open source file"

- Ensure all libraries are installed via Library Manager
- Restart Arduino IDE after installing libraries

### Error: "Port not available"

- Plug in USB-C cable
- Install CH340 driver (common for ESP32 boards):
  - Windows: Download from https://sparks.gogo.co.nz/ch340.html
  - Mac: Install via Homebrew or manual driver

### Error: "Failed to upload"

- Check USB cable (data cable, not charging-only)
- Try a different USB port
- Verify correct board (ESP32 Dev Module) and COM port selected
- Hold EN button for 2-3 seconds if upload fails

### Serial Monitor showing garbage characters

- Verify baud rate is 115200
- Board might be sending at different rate

---

## ✨ After Installation

Once libraries are installed and verified:

1. ✅ All `#include` errors will disappear
2. ✅ You can upload code to ESP32
3. ✅ RFID authentication will work with the backend
4. ✅ LED and Buzzer feedbacks will activate

You're ready to test the complete system! 🎉
