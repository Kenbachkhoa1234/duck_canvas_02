# Tích hợp Canvas 02 vào DuckMess

## 1. Dữ liệu cuộc trò chuyện

Thay mảng `people` trong `app.js` bằng dữ liệu từ store hiện tại:

- `id`: ID cuộc trò chuyện.
- `name`, `initials`: thông tin hiển thị.
- `preview`, `time`, `unread`: tin gần nhất.
- `online`: presence từ WebSocket.
- `colors`: accent của avatar.

## 2. Gửi tin nhắn

Prototype phát sự kiện sau khi submit composer:

```js
window.addEventListener('duckmess:send', (event) => {
  const { conversationId, text } = event.detail;
  // gọi hàm mã hóa + gửi WebSocket hiện tại tại đây
});
```

Trong bản tích hợp thật, bỏ đoạn cập nhật trực tiếp `.node--reply-lake` và render message theo store.

## 3. Dây nối reply

Khi thả một chấm neo lên tin nhắn, prototype phát:

```js
window.addEventListener('duckmess:thread-created', (event) => {
  const { from, to } = event.detail;
  // lưu quan hệ sourceMessageId -> targetMessageId
});
```

Ở production, đổi `data-anchor` và `data-target` thành ID message/attachment thật. Lưu quan hệ reply trong payload mã hóa; server chỉ nhận ciphertext như tin nhắn bình thường.

## 4. Ảnh và file

Các ảnh trong demo được tạo bằng CSS để chạy offline. Khi ghép:

- Thay `.photo-scene` bằng `<img>` dùng object URL/blob đã giải mã.
- Gọi pipeline upload/chia chunk hiện tại trước khi thêm node.
- Thu hồi object URL khi đóng cuộc trò chuyện.
- Không dùng URL ảnh bên thứ ba nếu muốn tránh lộ IP và metadata truy cập.

## 5. Layout

Các node hiện được đặt bằng class như `.node--file`, `.node--gallery`. Có thể giữ bố cục này cho bản đầu; về sau lưu `x/y` theo từng message nếu muốn người dùng tự kéo node trên canvas.

## 6. Bảo mật

Gói này chỉ là UI. Không đưa khóa, plaintext hoặc fingerprint thật vào DOM lâu hơn cần thiết. Dây nối chỉ lưu ID của message; nội dung và metadata nhạy cảm vẫn phải đi qua lớp mã hóa hiện có.
