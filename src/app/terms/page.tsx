import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Điều khoản sử dụng · AI Content Studio" };

// Draft: the owner must have it reviewed by someone qualified before relying on it.
export default function TermsPage() {
  return (
    <LegalPage title="Điều khoản sử dụng" updated="24/10/2026">
      <p>
        Chào mừng bạn đến với AI Content Studio (&quot;Dịch vụ&quot;). Khi tạo tài khoản hoặc sử dụng Dịch vụ, bạn đồng ý với các điều khoản dưới đây. Nếu
        không đồng ý, vui lòng không sử dụng Dịch vụ.
      </p>

      <h2>1. Dịch vụ là gì</h2>
      <p>
        Dịch vụ giúp chủ quán ăn, quán nước và cửa hàng nhỏ tạo menu điện tử có mã QR từ ảnh menu giấy, viết nội dung bài đăng bằng trí tuệ nhân tạo (AI), quản
        lý ảnh sản phẩm và có một trang website giới thiệu cửa hàng.
      </p>
      <p>
        Dịch vụ hiện được cung cấp <strong>miễn phí</strong>. Chúng tôi có thể thay đổi, bổ sung hoặc ngừng một phần tính năng, và sẽ thông báo trước khi
        áp dụng phí cho bất kỳ tính năng nào.
      </p>

      <h2>2. Tài khoản</h2>
      <ul>
        <li>Bạn đăng ký bằng email của mình và cần xác nhận email trước khi sử dụng.</li>
        <li>Mỗi tài khoản quản lý một cửa hàng.</li>
        <li>Bạn tự bảo mật mật khẩu và chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của mình.</li>
        <li>Thông tin bạn cung cấp (tên cửa hàng, địa chỉ, số điện thoại, tài khoản ngân hàng) phải đúng sự thật.</li>
      </ul>

      <h2>3. Nội dung của bạn</h2>
      <p>
        Bạn giữ toàn quyền sở hữu với ảnh, menu, giá và nội dung bạn đưa lên. Bạn cho phép chúng tôi lưu trữ, xử lý và hiển thị các nội dung đó trong phạm vi
        cần thiết để cung cấp Dịch vụ, bao gồm hiển thị công khai trên trang menu và website của cửa hàng.
      </p>
      <p>
        <strong>Bạn chịu trách nhiệm hoàn toàn về nội dung đăng tải</strong>, gồm tính chính xác của giá cả và thông tin món, quyền sử dụng ảnh, và việc
        tuân thủ pháp luật về quảng cáo, an toàn thực phẩm, bảo vệ người tiêu dùng.
      </p>
      <p>Bạn không được dùng Dịch vụ để:</p>
      <ul>
        <li>Mua bán, quảng cáo hàng hóa, dịch vụ bị pháp luật Việt Nam cấm hoặc chưa được phép kinh doanh;</li>
        <li>Đăng nội dung lừa đảo, sai sự thật, xúc phạm, vi phạm thuần phong mỹ tục hoặc quyền sở hữu trí tuệ của người khác;</li>
        <li>Giả mạo cửa hàng, thương hiệu hoặc cá nhân khác;</li>
        <li>Can thiệp, dò quét lỗ hổng, hoặc dùng công cụ tự động để lạm dụng hạn mức AI của hệ thống.</li>
      </ul>

      <h2>4. Nội dung do AI tạo</h2>
      <p>
        Menu được AI đọc từ ảnh và bài viết do AI soạn có thể sai tên món, sai giá hoặc chứa thông tin không chính xác.{" "}
        <strong>Bạn cần kiểm tra lại trước khi hiển thị hoặc đăng tải.</strong> Chúng tôi không chịu trách nhiệm về thiệt hại phát sinh từ nội dung AI mà
        bạn đã đăng mà không kiểm tra.
      </p>
      <p>
        Để giữ Dịch vụ miễn phí, mỗi cửa hàng có giới hạn số lượt dùng AI mỗi ngày, và toàn hệ thống cũng có giới hạn chung. Tính năng AI phụ thuộc vào nhà
        cung cấp bên thứ ba (Google Gemini) nên đôi lúc có thể chậm hoặc tạm thời không dùng được.
      </p>

      <h2>5. Thanh toán qua VietQR</h2>
      <p>
        Nút chuyển khoản VietQR trên menu chuyển tiền <strong>trực tiếp vào tài khoản ngân hàng của cửa hàng</strong>. Chúng tôi không nhận, giữ hay xử lý
        tiền của bạn hoặc của khách, và không phải là một bên trong giao dịch giữa cửa hàng và khách hàng. Bạn tự kiểm tra tiền đã về trước khi giao hàng
        hoặc phục vụ.
      </p>

      <h2>6. Khóa cửa hàng và chấm dứt</h2>
      <p>
        Chúng tôi có quyền <strong>tạm khóa cửa hàng</strong> (trang menu và website sẽ không hiển thị với khách) hoặc xóa nội dung, khi có dấu hiệu vi phạm
        Điều khoản này hoặc pháp luật, hoặc theo yêu cầu của cơ quan nhà nước có thẩm quyền. Trong trường hợp không khẩn cấp, chúng tôi sẽ cố gắng thông báo
        cho bạn trước.
      </p>
      <p>Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản bất cứ lúc nào bằng cách liên hệ với chúng tôi.</p>

      <h2>7. Giới hạn trách nhiệm</h2>
      <p>
        Dịch vụ được cung cấp &quot;nguyên trạng&quot;, không cam kết hoạt động liên tục hay không có lỗi. Trong phạm vi pháp luật cho phép, chúng tôi không
        chịu trách nhiệm về các thiệt hại gián tiếp như mất doanh thu, mất dữ liệu hay gián đoạn kinh doanh phát sinh từ việc sử dụng Dịch vụ. Bạn nên tự lưu
        giữ bản sao ảnh và menu quan trọng.
      </p>

      <h2>8. Dữ liệu cá nhân</h2>
      <p>
        Việc thu thập và xử lý dữ liệu cá nhân được mô tả trong{" "}
        <Link href="/privacy" className="text-indigo-700 underline">
          Chính sách bảo mật
        </Link>
        .
      </p>

      <h2>9. Thay đổi điều khoản</h2>
      <p>
        Chúng tôi có thể cập nhật Điều khoản này. Bản mới có hiệu lực từ ngày đăng trên trang này; với thay đổi quan trọng, chúng tôi sẽ thông báo qua email.
        Tiếp tục sử dụng Dịch vụ sau đó nghĩa là bạn đồng ý với bản mới.
      </p>

      <h2>10. Luật áp dụng và liên hệ</h2>
      <p>
        Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp được ưu tiên giải quyết bằng thương lượng; nếu không thành, sẽ đưa ra tòa án có
        thẩm quyền tại Việt Nam. Mọi câu hỏi, vui lòng liên hệ qua <ContactLine />.
      </p>
    </LegalPage>
  );
}
