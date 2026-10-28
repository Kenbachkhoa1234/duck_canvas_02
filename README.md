# DuckMess Canvas 02

Prototype giao diện DuckMess dạng canvas có thể chạy độc lập, tập trung vào thao tác nối nội dung trực quan.

## Điểm chính

- Danh sách cuộc trò chuyện nằm ngang phía trên.
- Tin chữ, file, voice và gallery bốn ảnh có kích thước riêng.
- Mỗi ảnh có chấm neo. Kéo chấm tới một tin nhắn để tạo dây reply.
- Dây nối tự cập nhật khi thay đổi kích thước cửa sổ.
- Nhấn ảnh để xem preview; nhấn `+` để mở công cụ gửi nhanh.
- Gửi tin nhắn demo và phát sự kiện để app chính bắt lại.
- Không dùng framework, CDN hoặc tài nguyên mạng ngoài.

## Chạy thử

Có thể mở trực tiếp `index.html`, hoặc chạy web server tĩnh trong folder:

```powershell
python -m http.server 4173
```

Sau đó mở `http://127.0.0.1:4173`.

Khi local server đang chạy, có thể kiểm tra kéo dây, composer và menu công cụ bằng:

```powershell
node test/smoke.mjs http://127.0.0.1:4173/
```

## File

- `index.html`: cấu trúc giao diện.
- `styles.css`: layout Canvas 02 và responsive.
- `app.js`: dữ liệu demo, composer, gallery và engine kéo dây.
- `INTEGRATION.md`: hướng dẫn nối với DuckMess thật.
- `reference.png`: concept đã chốt để đối chiếu.
- `preview.png`: ảnh chụp code chạy thật sau khi kiểm thử.
- `theme.json`: metadata của gói giao diện.
- `test/smoke.mjs`: smoke test trình duyệt không cần thư viện ngoài.

## Lưu ý

Đây là lớp giao diện demo, chưa chứa WebSocket, mã hóa hoặc upload thật. Khi tích hợp, giữ nguyên logic bảo mật hiện tại của DuckMess và thay dữ liệu mẫu bằng dữ liệu đã giải mã trong client.
