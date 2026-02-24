# Google Maps Integration Setup

## 🗺️ Tích hợp Google Maps đã hoàn thành!

Ứng dụng đã được cập nhật để hiển thị trên Google Maps thực tế.

---

## 📋 Cách lấy Google Maps API Key (MIỄN PHÍ)

### Bước 1: Truy cập Google Cloud Console
1. Vào: https://console.cloud.google.com/
2. Đăng nhập bằng tài khoản Google của bạn

### Bước 2: Tạo Project mới
1. Click vào dropdown "Select a project" ở góc trên
2. Click "NEW PROJECT"
3. Đặt tên project: "ACO-Maps" (hoặc tên bất kỳ)
4. Click "CREATE"

### Bước 3: Enable Google Maps JavaScript API
1. Vào: https://console.cloud.google.com/apis/library
2. Tìm "Maps JavaScript API"
3. Click vào và nhấn "ENABLE"

### Bước 4: Tạo API Key
1. Vào: https://console.cloud.google.com/apis/credentials
2. Click "CREATE CREDENTIALS" → "API Key"
3. Copy API Key (dạng: AIzaSyB...)
4. (Tùy chọn) Click "RESTRICT KEY" để giới hạn sử dụng

### Bước 5: Thêm API Key vào code
1. Mở file: `frontend/src/App.js`
2. Tìm dòng 9: `const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY_HERE";`
3. Thay thế bằng: `const GOOGLE_MAPS_API_KEY = "AIzaSyB...";`
4. Save file

---

## 🎯 Tính năng Google Maps mới

### ✨ Đã có gì:
- ✅ Hiển thị bản đồ thực tế của khu vực Hà Nội
- ✅ Các điểm (nodes) với GPS coordinates thực
- ✅ Polylines cho các tuyến đường
- ✅ Markers cho điểm bắt đầu/kết thúc
- ✅ Animation các con kiến di chuyển trên bản đồ
- ✅ Pheromone trails màu vàng
- ✅ InfoWindow hiển thị thông tin điểm
- ✅ Map controls (zoom, map type, etc.)
- ✅ Blocked routes với đường đứt nét

### 🎮 Cách sử dụng:
1. Thêm API Key vào App.js
2. Restart frontend: `npm start`
3. Chọn điểm bắt đầu và kết thúc
4. Click "Find Optimal Path"
5. Click "Animate Process" để xem kiến di chuyển!

---

## 🔧 Tùy chỉnh tọa độ

Để thay đổi vị trí các điểm trên bản đồ:

**File:** `backend/app.py`

```python
node_positions = {
    "A": {"lat": 21.0285, "lng": 105.8542, "name": "Tên địa điểm"},
    # Thay đổi lat, lng theo vị trí thực tế bạn muốn
}
```

### Cách lấy tọa độ GPS:
1. Mở Google Maps
2. Click chuột phải vào vị trí
3. Click vào tọa độ để copy (ví dụ: 21.0285, 105.8542)

---

## 🎨 So sánh 2 version

### Canvas Version (AppCanvas.js):
- Vẽ đồ thị 2D đơn giản
- Animation mượt hơn
- Không cần API key

### Google Maps Version (App.js - hiện tại):
- Hiển thị bản đồ thực
- GPS coordinates thực tế
- Trực quan hơn cho real-world scenarios
- Cần API key (free)

---

## 🔄 Switch giữa 2 version

```bash
# Dùng Google Maps version (hiện tại)
cp src/AppGoogleMaps.js src/App.js

# Dùng Canvas version
cp src/AppCanvas.js src/App.js
```

---

## 💡 Lưu ý quan trọng

1. **API Key là MIỄN PHÍ** cho 28,000 map loads/tháng
2. Google yêu cầu thẻ tín dụng nhưng KHÔNG TỰ ĐỘNG CHARGE
3. Có thể restrict API key theo domain để bảo mật
4. Nếu không có API key, app sẽ báo lỗi nhưng vẫn chạy được các chức năng khác

---

## 🚀 Demo Scenarios

### Scenario 1: Mountain Trekking
- Chọn A (Ba Vi Base) → H (Peak Viewpoint)
- Xem đường đi tối ưu trên bản đồ thực

### Scenario 2: Disaster Response
- Block route C-D (simulate landslide)
- System sẽ tìm đường alternative

### Scenario 3: Multi-path Analysis
- Animate để xem các con kiến thử nhiều đường khác nhau
- Pheromone trails cho biết đường nào được ưa chuộng

---

## 📞 Support

Nếu gặp vấn đề:
1. Check API key đã đúng format
2. Check API đã enable: Maps JavaScript API
3. Check browser console để xem error details
4. Thử refresh page (Ctrl + F5)

---

Enjoy your Google Maps powered ACO system! 🎉🗺️🐜
