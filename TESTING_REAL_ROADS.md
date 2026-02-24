## 🔍 Hướng dẫn kiểm tra Real Roads đang hoạt động

### Bước 1: Mở Browser Console
1. Mở http://localhost:3001
2. Nhấn F12 hoặc Right-click → Inspect
3. Chọn tab "Console"

### Bước 2: Quan sát Logs
Khi trang load, bạn sẽ thấy logs như sau:

```
⏳ Waiting for graph or directions service...
🚀 Starting to fetch real road paths for 13 edges
📍 Fetching route: A-B
✅ Got real path for A-B: 45 points
📍 Fetching route: A-C
✅ Got real path for A-C: 67 points
...
🎉 Finished fetching directions! Success: 13, Fallback: 0
📊 Total edges with paths: 26
🗺️ Rendering edge A-B with 45 points: [{lat:..., lng:...}, ...]
```

### Bước 3: Kiểm tra trên Map
1. **Trước khi load xong**: Sẽ thấy thông báo màu xanh "Loading real road paths..."
2. **Sau khi load xong**: Các đường nối sẽ uốn lượn theo đường thật, không còn thẳng băng qua

### Bước 4: So sánh
**TRƯỚC (đường thẳng - SAI):**
```
Node A -------- (đường thẳng qua sông) -------- Node B
```

**SAU (theo đường thật - ĐÚNG):**
```
Node A ~~/~~~/~~~/~~~ (đi qua cầu, theo highway) ~~~\~~~\~~~ Node B
```

### Bước 5: Test với nhiều edges
1. Zoom vào từng cặp nodes
2. Xem đường nối có đi theo roads không
3. Check xem có bypass sông/núi hợp lý không

### Nếu vẫn thấy đường thẳng
Kiểm tra console logs:
- Nếu có ❌ → Directions API bị lỗi, dùng fallback (đường thẳng)
- Nếu có ⚠️ → Chế độ DRIVING thất bại, đã chuyển sang WALKING
- Nếu không có logs → DirectionsService chưa được init

### Common Issues

#### 1. API Key invalid
```
❌ Could not get directions for A-B: REQUEST_DENIED
```
→ Check API key trong App.js line 8
→ Enable Directions API tại Google Cloud Console

#### 2. Rate limit
```
❌ Could not get directions for C-D: OVER_QUERY_LIMIT
```
→ Code đã có delay 150ms giữa mỗi request
→ Nếu vẫn bị → tăng delay lên 200ms

#### 3. No route found
```
⚠️ DRIVING failed for E-F, trying WALKING...
✅ Got real path for E-F: 23 points
```
→ Bình thường, một số nơi không có đường ô tô

#### 4. Straight line fallback
```
❌ Could not get directions for G-H: ZERO_RESULTS - using straight line
```
→ Không tìm thấy đường đi nào (có thể 2 điểm quá xa)
→ Dùng fallback đường thẳng

### Performance
- 13 edges × 150ms delay = ~2 giây load time
- Path thường có 20-100 points mỗi edge
- Total memory: ~50KB cho tất cả paths
- Render: Smooth 60fps

### Success Indicators
✅ Console log "🎉 Finished fetching directions!"
✅ Thông báo "Loading..." biến mất
✅ Đường uốn lượn theo roads trên map
✅ Không có đường nào xuyên qua sông/núi vô lý
✅ Ants di chuyển theo đường thật khi animate
