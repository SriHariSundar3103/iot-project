# 🏥 Smart Hospital Tool Tracking System

A secure, real-time IoT + Web system for tracking healthcare assets with RFID authentication, QR code scanning, and real-time dashboard.

## 📁 Project Structure

```
├── frontend/               # Next.js + Tailwind CSS
├── backend/               # Express.js + MongoDB
├── esp32/                # Arduino ESP32 Code
├── PIN_CONNECTIONS.md    # Hardware pin configuration
├── SETUP.md             # Installation & setup guide
└── README.md
```

## 🚀 Quick Start

1. **[Read SETUP.md](./SETUP.md)** for complete installation instructions
2. **[Check PIN_CONNECTIONS.md](./PIN_CONNECTIONS.md)** for ESP32 hardware setup
3. Start backend: `npm install && npm start` (in backend folder)
4. Start frontend: `npm install && npm run dev` (in frontend folder)
5. Upload ESP32 code using Arduino IDE

## 🎯 Key Features

✅ Real-time WebSocket updates  
✅ RFID staff authentication  
✅ QR code tool scanning  
✅ Image capture for audit trail  
✅ Admin dashboard  
✅ Auto alerts via email  
✅ Role-based access control  
✅ Analytics & reporting  
✅ Mobile-responsive UI

## 🔧 Technology Stack

- **Frontend**: Next.js 14, Tailwind CSS, Socket.io
- **Backend**: Express.js, MongoDB, JWT
- **IoT**: ESP32, RC522 RFID, Firebase/Pushbullet alerts
- **Database**: MongoDB Atlas
- **Messaging**: Google SMTP

## 📧 Support

For issues, check logs in backend `logs/` directory or browser console.
