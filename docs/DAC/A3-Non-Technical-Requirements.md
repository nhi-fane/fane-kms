# A3 - Non-Technical Requirements

Tài liệu này định nghĩa các yêu cầu phi kỹ thuật (UX/UI, Data Integrity, Usability) cho từng component của hệ thống FanE Traffic Management.

## 1. Component: Authorization & CEO Permission Portal
- **Giao diện ma trận quyền trực quan:** UI Portal cấp quyền cho CEO phải cực kỳ gọn gàng. Sử dụng hệ thống biểu tượng/màu sắc (Tick xanh cho quyền có sẵn, Checkbox xám cho mặc định, Dấu X đỏ cho tước quyền) để CEO có thể nhìn lướt qua là hiểu ngay bức tranh phân quyền của một cá nhân.
- **Tính tự động hoá:** CEO không cần thao tác onboarding nhân viên mới. Chức danh (Role) sẽ tự động map với quyền mặc định. Hệ thống chỉ yêu cầu CEO thao tác khi có thay đổi ngoại lệ.
- **Data Masking UX:** Các trường dữ liệu bị ẩn do phân quyền (ví dụ lương, chi phí) phải hiển thị rõ ràng nhãn **"Censored"** thay vì báo lỗi hệ thống hoặc hiển thị số "0". Điều này giúp người dùng (Kế toán, Nhân sự) hiểu rõ lý do không xem được là do phân quyền.
- **Truy vết trách nhiệm (Non-repudiation):** Hệ thống Audit Log phải đủ minh bạch để khi có tranh chấp (ví dụ: một Timesheet bị sửa sai), có thể chứng minh được là do user tự làm hay do một Admin nào đó đang dùng tính năng Impersonate để thao tác thay.

## 2. Component: Admin Portal (Master Data Management)
- **Trải nghiệm Spreadsheet-like:** Tốc độ nhập liệu là ưu tiên số 1. User (Account) phải có thể dùng phím Tab/Enter để nhảy giữa các ô (cells). Không sử dụng Modal popup để thêm mới hay sửa dữ liệu nhằm giữ mạch tư duy của User.
- **Global Action Buttons:** Các nút `Save Changes` và `Revert Changes` phải luôn được Sticky (dính) ở vị trí dễ nhìn thấy nhất trên màn hình để user biết họ đang có dữ liệu tạm chưa được lưu.
- **Bảo vệ Dữ liệu:** Chức năng Xoá (Delete) chỉ khả dụng đối với Project/Client rỗng. Giao diện tự động vô hiệu hoá (Disable/Mờ đi) nút Delete nếu đã có Data phát sinh và hướng dẫn user dùng tính năng "Archive/Cancel" thay thế.

## 3. Component: My Portal & Timesheet
- **Chống "Ảo giác" (Anti-Hallucination) UI:** Bất kỳ nơi nào hiển thị con số Capacity % (Mức độ bận rộn tính theo giờ đã duyệt), BẮT BUỘC phải hiển thị kèm số lượng Active Tasks ngay bên dưới. Điều này giúp Quản lý không giao thêm việc cho người đang có Capacity 0% nhưng lại đang ôm 10 Tasks chưa kịp làm.
- **Thao tác 1 click:** Giao diện Gantt Chart / Timeline phải cho phép click trực tiếp vào ô lưới (Grid) của ngày hôm nay để gõ số giờ làm, thay vì phải mở form rườm rà.
- **Cảnh báo thị giác (Visual Fraud Warning):** Nếu tổng số giờ log trong 1 ngày của 1 nhân viên vượt quá 24h, dòng dữ liệu đó trên màn hình duyệt của Lead sẽ tự động bị bôi đỏ chót (Glowing Red) để cảnh báo kiểm tra chéo.

## 4. Component: Traffic Dashboard
- **Real-time Feel:** Các biểu đồ Donut Chart (Zone 3) phải có micro-animations (hiệu ứng chuyển động nhẹ) khi load data để tạo cảm giác hệ thống sống động (dynamic design). 
- **Thiết kế Premium (WOW Factor):** Giao diện phải mang tính thẩm mỹ cao (Web Application Development principles). Sử dụng bảng màu Harmonic (Color Palette) chuyên nghiệp, Typography hiện đại (Inter, Roboto), và thiết kế bo góc, Glassmorphism cho các thẻ chỉ số (Stats cards) để tạo ấn tượng mạnh cho BOD khi truy cập. Tránh thiết kế dạng MVP đơn điệu.

## 5. Component: Bot Integration (Telegram)
- **Không làm phiền (Do Not Disturb):** Trải nghiệm nhân sự phải được tôn trọng tuyệt đối. Bot chỉ được phép nhắn tin nếu:
  1. Hôm đó là ngày làm việc bình thường.
  2. Nhân sự đó đang có ít nhất 1 task In Progress.
  3. Nhân sự đó chưa log giờ hoặc chưa báo Done cho các task đó.
- **Điều hướng mượt mà:** Tin nhắn nhắc nhở của Bot phải luôn luôn kèm theo 1 nút bấm (Button link) mở thẳng ra màn hình My Portal trên Web App để nhân sự thao tác ngay nếu họ muốn giao diện rộng rãi hơn.
