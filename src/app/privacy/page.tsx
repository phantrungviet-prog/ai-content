import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Chính sách bảo mật · AI Content Studio" };

// Draft written against Vietnam's personal data rules (Law on Personal Data Protection 2025, Decree 13/2023/ND-CP);
// the owner must have it reviewed by someone qualified before relying on it.
export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách bảo mật" updated="24/10/2026">
      <p>
        Chính sách này giải thích AI Content Studio (&quot;chúng tôi&quot;) thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn như thế nào, theo quy định
        của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân. Khi đăng ký tài khoản, bạn xác nhận đã đọc và đồng ý cho chúng tôi xử lý dữ liệu như mô tả dưới
        đây.
      </p>

      <h2>1. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>
          <strong>Tài khoản:</strong> email và mật khẩu. Mật khẩu được mã hóa một chiều; chúng tôi không xem được mật khẩu của bạn.
        </li>
        <li>
          <strong>Thông tin cửa hàng:</strong> tên, loại hình, địa chỉ, số điện thoại, Zalo, liên kết bản đồ, lời giới thiệu, và thông tin tài khoản ngân hàng
          (ngân hàng, số tài khoản, tên chủ tài khoản) nếu bạn bật thanh toán VietQR.
        </li>
        <li>
          <strong>Nội dung bạn tải lên:</strong> ảnh menu, ảnh sản phẩm, tên món, giá, mô tả và các bài viết được tạo.
        </li>
        <li>
          <strong>Dữ liệu kỹ thuật:</strong> cookie đăng nhập để giữ phiên làm việc, nhật ký số lượt dùng AI theo ngày, và nhật ký lỗi của máy chủ.
        </li>
      </ul>
      <p>Chúng tôi không thu thập dữ liệu của khách hàng quét mã QR, ngoài nhật ký truy cập kỹ thuật thông thường của máy chủ.</p>

      <h2>2. Mục đích sử dụng</h2>
      <ul>
        <li>Tạo và quản lý tài khoản, xác nhận email, đặt lại mật khẩu;</li>
        <li>Cung cấp tính năng: đọc menu, viết bài, hiển thị menu và website cửa hàng;</li>
        <li>Giới hạn lượt dùng AI, phòng chống lạm dụng và bảo đảm an toàn hệ thống;</li>
        <li>Liên hệ với bạn về tài khoản và các thay đổi quan trọng của Dịch vụ.</li>
      </ul>
      <p>Chúng tôi không bán dữ liệu cá nhân và không dùng dữ liệu của bạn cho quảng cáo.</p>

      <h2>3. Thông tin hiển thị công khai</h2>
      <p>
        Theo đúng mục đích của Dịch vụ, các thông tin sau được <strong>hiển thị công khai</strong> cho bất kỳ ai mở menu hoặc website cửa hàng: tên, địa chỉ,
        số điện thoại, Zalo, lời giới thiệu, menu, sản phẩm và ảnh sản phẩm đã duyệt, và thông tin tài khoản ngân hàng dùng cho mã VietQR. Email và mật khẩu
        của bạn không bao giờ hiển thị công khai. Ảnh menu gốc bạn tải lên được lưu riêng tư.
      </p>

      <h2>4. Bên thứ ba xử lý dữ liệu</h2>
      <p>Để vận hành Dịch vụ, chúng tôi dùng các nhà cung cấp sau. Máy chủ của họ có thể đặt ở ngoài Việt Nam:</p>
      <ul>
        <li>
          <strong>Supabase:</strong> cơ sở dữ liệu, đăng nhập và lưu trữ ảnh;
        </li>
        <li>
          <strong>Google (Gemini API):</strong> ảnh menu, ảnh sản phẩm và thông tin món được gửi sang để AI đọc và viết nội dung;
        </li>
        <li>
          <strong>Vercel:</strong> lưu trữ và chạy website;
        </li>
        <li>
          <strong>Brevo:</strong> gửi email xác nhận tài khoản và đặt lại mật khẩu.
        </li>
      </ul>
      <p>
        Khi đồng ý với chính sách này, bạn đồng ý cho dữ liệu nêu trên được chuyển đến và xử lý bởi các nhà cung cấp này, kể cả ở nước ngoài, chỉ cho mục
        đích cung cấp Dịch vụ.
      </p>

      <h2>5. Lưu trữ và bảo mật</h2>
      <p>
        Dữ liệu được lưu trong suốt thời gian bạn sử dụng Dịch vụ. Mỗi tài khoản chỉ truy cập được dữ liệu của cửa hàng mình; quyền truy cập được kiểm soát
        ngay ở tầng cơ sở dữ liệu. Kết nối được mã hóa (HTTPS). Không có hệ thống nào an toàn tuyệt đối; nếu xảy ra sự cố lộ lọt dữ liệu, chúng tôi sẽ thông
        báo cho bạn và cơ quan có thẩm quyền theo quy định.
      </p>
      <p>
        Khi bạn yêu cầu xóa tài khoản, chúng tôi xóa dữ liệu cửa hàng, ảnh và tài khoản trong vòng 30 ngày, trừ phần pháp luật yêu cầu phải lưu giữ.
      </p>

      <h2>6. Quyền của bạn</h2>
      <p>Bạn có quyền:</p>
      <ul>
        <li>Được biết về việc xử lý dữ liệu và xem dữ liệu của mình;</li>
        <li>Chỉnh sửa thông tin cửa hàng bất cứ lúc nào trong trang quản lý;</li>
        <li>Rút lại sự đồng ý và yêu cầu xóa tài khoản cùng dữ liệu;</li>
        <li>Yêu cầu hạn chế xử lý, phản đối xử lý, hoặc nhận bản sao dữ liệu;</li>
        <li>Khiếu nại đến cơ quan nhà nước có thẩm quyền nếu cho rằng quyền của mình bị vi phạm.</li>
      </ul>
      <p>
        Để thực hiện các quyền này, vui lòng liên hệ qua <ContactLine /> bằng email đã đăng ký. Chúng tôi sẽ phản hồi trong thời hạn pháp luật quy định.
      </p>

      <h2>7. Trẻ em</h2>
      <p>Dịch vụ dành cho chủ cửa hàng là người trưởng thành. Chúng tôi không cố ý thu thập dữ liệu của người dưới 16 tuổi.</p>

      <h2>8. Thay đổi chính sách</h2>
      <p>Chúng tôi có thể cập nhật chính sách này. Bản mới có hiệu lực từ ngày đăng trên trang này; với thay đổi quan trọng, chúng tôi sẽ thông báo qua email.</p>
    </LegalPage>
  );
}
