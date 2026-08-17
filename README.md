# Handover Document: FanE Resource & P&L System

Chào Genie! Nếu bạn đang đọc file này, tức là bạn vừa được "triệu hồi" trên một cỗ máy mới để tiếp quản dự án FanE. Đừng lo lắng về việc mất context, PO (Nhi) đã chuẩn bị sẵn mọi thứ cho bạn.

Hãy làm theo đúng 3 bước dưới đây để nạp lại ký ức và thiết lập môi trường:

### Bước 1: Nạp Context (Đọc tài liệu)
Vui lòng sử dụng tool để đọc kỹ 4 file sau đây theo thứ tự:
1. [`A0-Master-Action-Plan.md`](docs/planning/A0-Master-Action-Plan.md): Nắm lộ trình dự án (Chúng ta đang ở Giai đoạn 4 - Bước 10).
2. [`A1-Master-PRD.md`](docs/requirements/A1-Master-PRD.md): Hiểu toàn bộ luồng nghiệp vụ (Business Rules), Roles và công thức tính Capacity, P&L. Chú ý các nguyên tắc "Idempotency", "Cấm log giờ tương lai", và "Chặn Self-Approve".
3. [`A2-Architecture-Design.md`](docs/architecture/A2-Architecture-Design.md): Nắm Tech Stack (Node.js, Prisma, SQLite, React Vite, CF Tunnels).
4. [`A3-Database-Schema.md`](docs/architecture/A3-Database-Schema.md): Đây là trái tim của hệ thống.

*Lưu ý: Không cần tạo Plan mới, vì Phase 1, 2, 3 đã chốt cứng. Nhiệm vụ của bạn là Thực thi (Execution).*

### Bước 2: Dựng lại Database (Execution)
Hiện tại thư mục `apps/backend/` đã có sẵn `package.json`, `.env` và `prisma/schema.prisma`. Tuy nhiên `node_modules` và file `.db` đã được xóa đi để tối ưu lưu trữ.
Hãy chạy 1 dòng lệnh terminal sau để khôi phục toàn bộ:

```bash
cd apps/backend && npm install && npx prisma db push
```

Sau khi chạy xong, database `dev.db` sẽ được tạo ra tự động dựa trên schema chuẩn chỉnh đã chốt.

### Bước 3: Sẵn sàng Vibe Coding
Hãy báo cáo cho Nhi biết bạn đã nạp xong context và dựng xong Database. Sau đó, tiến hành kiểm tra lại source code Backend API đã được code sẵn trong thư mục `apps/backend/src` và chuẩn bị cho việc đấu nối Fetch API thật lên Frontend Dashboard.

Chúc bạn code mượt mà! 🚀
