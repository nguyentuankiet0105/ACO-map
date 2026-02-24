# Google Maps Real Roads Integration

## Vấn đề đã fix
Trước đây các đường nối (edges) giữa các nodes được vẽ bằng đường thẳng, không theo tuyến đường thực tế. Điều này gây ra tình huống vô lý như đường đi băng qua sông nhưng không có cầu.

## Giải pháp
Sử dụng **Google Maps Directions API** để lấy đường đi thực tế:

### 1. Thêm DirectionsService
```javascript
// Initialize directions service
directionsServiceRef.current = new window.google.maps.DirectionsService();
```

### 2. Fetch Real Road Paths
Khi graph load, tự động gọi Directions API cho tất cả các edges:
```javascript
useEffect(() => {
  if (!graph || !graph.edges || !directionsServiceRef.current) return;

  const fetchDirections = async () => {
    for (const edge of graph.edges) {
      // Request directions from Google Maps
      const result = await directionsService.route({
        origin: { lat: fromPos.lat, lng: fromPos.lng },
        destination: { lat: toPos.lat, lng: toPos.lng },
        travelMode: DRIVING or WALKING
      });

      // Extract path points
      const path = result.routes[0].overview_path;
      edgeDirections[edgeKey] = path;
    }
  };

  fetchDirections();
}, [graph]);
```

### 3. Render Polylines theo Real Roads
Thay vì path với 2 điểm, giờ dùng nhiều điểm từ Directions API:
```javascript
<Polyline
  path={edgeDirections[edgeKey]}  // Multiple points along real road
  options={{
    geodesic: false,  // Don't use geodesic since we have real points
    ...
  }}
/>
```

### 4. Animate Ants theo Real Roads
Kiến giờ sẽ di chuyển theo từng segment của đường thực tế:
```javascript
// Calculate position along road path
const totalSegments = roadPath.length - 1;
const segmentIndex = Math.floor(ant.progress * totalSegments);
const segmentProgress = (ant.progress * totalSegments) - segmentIndex;

// Interpolate between segments
ant.lat = currentSegment.lat + (nextSegment.lat - currentSegment.lat) * segmentProgress;
ant.lng = currentSegment.lng + (nextSegment.lng - currentSegment.lng) * segmentProgress;
```

## Lưu ý quan trọng

### API Rate Limits
- Google Maps Directions API có giới hạn: **50 requests/second**
- Code có delay 100ms giữa mỗi request để tránh rate limit
- Với 13 edges → ~1.3 giây để load toàn bộ

### Fallback Strategy
Nếu Directions API thất bại (không có đường đi):
1. Thử lại với WALKING mode
2. Nếu vẫn thất bại → fallback về đường thẳng

### Caching
Directions được cache trong state `edgeDirections`:
```javascript
const [edgeDirections, setEdgeDirections] = useState({});
```
Mỗi edge được lưu 2 chiều:
- `A-B`: path từ A đến B
- `B-A`: path reverse từ B đến A

## Benefits
✅ Đường đi theo tuyến đường thực tế (roads, highways)
✅ Tránh các trở ngại (rivers, mountains) trừ khi có cầu/tunnel
✅ Khoảng cách chính xác hơn
✅ Visualization chân thực hơn
✅ Phù hợp với tình huống thực tế (disaster response, trekking)

## Testing
1. Load app → Đợi ~2 giây để fetch directions
2. Zoom vào map → Thấy đường đi uốn lượn theo roads
3. Compare với đường thẳng trước đây
4. Test với blocked edges → Vẫn highlight đúng
5. Chạy animation → Ants đi theo đường thực tế
