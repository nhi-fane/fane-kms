# Phương án Requirements & Testing (QA/QC) Hệ thống FanE

Dựa trên Master PRD (A1), hệ thống FanE có mức độ phức tạp cao về phân quyền (RBAC), tính toán logic % (Capacity), bảo mật dữ liệu P&L, và luồng dữ liệu đa kênh (Web <-> Backend <-> Telegram). 

Để đảm bảo hệ thống chạy mượt mà và đúng kỳ vọng trước khi Rollout (Bước 13), dưới đây là **Phương án Kiểm thử (QA/QC Plan)** chi tiết.

## 1. Kiểm thử Bảo mật & Phân quyền (Security & Authorization Testing)

Phần này đặc biệt quan trọng để tránh rò rỉ thông tin lương/chi phí nội bộ.

*   **Impersonate Mode (PO):**
    *   *Test case:* Dùng role PO đóng vai 1 nhân sự bất kỳ -> Thử log giờ (POST), sửa task (PUT), xoá task (DELETE) qua API Postman/F12.
    *   *Expectation:* Backend trả về lỗi `403 Forbidden` (do bị chặn bởi `isReadOnly=true` claim).
*   **Data Masking (Kế toán):**
    *   *Test case:* Đăng nhập role Kế toán -> Truy cập danh sách `PNL_TRANSACTION` chứa `Internal_Cost` -> Dùng F12 (Network Tab) soi API response.
    *   *Expectation:* Không tồn tại data thật của `Staff_ID`, `Reference_ID`, và `Cost_Per_Hour`. API chỉ trả về `0` hoặc `Hidden`.
*   **Chống gian lận (Self-approval fraud):**
    *   *Test case 1 (Ngăn chặn):* Creative Lead tự duyệt Timesheet của chính mình.
    *   *Expectation 1:* Bị chặn hoặc UI không hiện nút Approve cho record của bản thân (chỉ CD mới thấy và duyệt được cho Lead).
    *   *Test case 2 (Ngoại lệ hợp lệ):* Creative Director tự log và tự duyệt Timesheet của chính mình.
    *   *Expectation 2:* Giao diện cho phép Creative Director tự approve timesheet cá nhân thành công.

## 2. Kiểm thử Luồng Dữ liệu Cốt lõi (Core Data Integrity Testing)

Đảm bảo dữ liệu không bị sai lệch, nhân bản khi người dùng thao tác nhầm.

*   **Logic PNL_TRANSACTION vs Timesheet:**
    *   *Test case:* CD/Lead duyệt (Approve) 1 Timesheet.
    *   *Expectation:* Bảng `PNL_TRANSACTION` tự động đẻ ra 1 record `Internal_Cost` với `Historical_Cost_Per_Hour`.
    *   *Test case (Edge):* CD sửa số giờ của Timesheet đã duyệt (vd: 8h -> 5h) hoặc Un-approve.
    *   *Expectation:* Record tương ứng trong `PNL_TRANSACTION` tự động update số tiền mới hoặc bị xoá đi.
*   **Logic chặn thao tác sai (Validation):**
    *   *Test case:* Log giờ cho ngày mai (tương lai); Account tạo Project mà để trống Creative Lead; Log giờ > 24h/ngày.
    *   *Expectation:* Báo lỗi, không cho lưu DB (riêng case > 24h thì cho lưu nhưng UI phải nổi cảnh báo Warning Đỏ tại màn hình CD/Lead Approve).

## 3. Kiểm thử Dashboard UI & Metrics (Zone 1-4)

Kiểm tra độ chính xác của các công thức tính toán và hiển thị UI theo thiết kế.

*   **Zone 3 - Capacity % Formula:**
    *   *Test case:* Nhân sự làm 40h/tuần, xin nghỉ phép 1 ngày (8h). Đã log 36h.
    *   *Expectation:* Capacity % = 36 / (40 - 8) = **112%**. Donut chart full vòng 100%, glowing red (Overload). Hiển thị song cập "Đang gánh: X tasks".
*   **Zone 4 - Gantt Chart Visuals:**
    *   *Test case:* Xem task có log giờ vào cuối tuần/ngày lễ/ngày nghỉ phép.
    *   *Expectation:* Các cột ngày này bị bôi xám (Soft boundaries), nhưng dải màu đặc của Task vẫn chạy vắt qua bình thường. Mốc đỏ Deadline hiển thị đúng.
*   **Zone 1 - Date Filter:**
    *   *Test case:* Chọn Date Range filter ở Zone 1.
    *   *Expectation:* Zone 2 & Zone 3 thay đổi data tương ứng. Zone 4 (Gantt) KHÔNG bị ảnh hưởng bởi filter này. Không cho chọn Date Range ở tương lai.

## 4. Kiểm thử Telegram Chatbot (End-to-End Flow)

Đây là điểm chạm thực tế nhất với user, cần test kĩ trải nghiệm.

*   **DND Rules (Do Not Disturb):**
    *   *Test case:* Tới 18:00 các ngày: T7/CN, Ngày nghỉ lễ, Ngày nhân viên đó xin nghỉ phép (FullDay), Nhân viên đã log "Done" toàn bộ task.
    *   *Expectation:* Bot IM LẶNG, tuyệt đối không gửi tin nhắn nhắc nhở.
*   **Data Sync (Web <-> Bot):**
    *   *Test case:* Nhân sự log 4h trên Bot -> Mở Web App kiểm tra.
    *   *Expectation:* Web App cập nhật real-time trạng thái (Approval Pending).

## 5. Quy trình QA/QC thực tế (Thực hiện ở Bước 13)

1. **Unit Test & API Test (Nhi & Bot thực hiện):** Chạy test Postman các endpoint P&L, Timesheet, JWT Role trước khi kết nối UI.
2. **Manual E2E Testing (Nhi & Bot thực hiện):** Đóng vai 1 flow trọn vẹn: *Account tạo Project -> Assign Lead -> Lead tạo Task -> Bot nhắc nhở -> Staff log giờ qua Telegram -> CD Approve web -> Check P&L Chart*.
3. **UAT (User Acceptance Testing):** Sau khi setup Cloudflare Tunnels (Bước 12), gửi link Tunnel cho 1-2 bạn đại diện (1 Account, 1 CD) vào dùng thử trong 1 ngày bằng Data Mock để xin feedback UI/UX trước khi Rollout toàn công ty.
