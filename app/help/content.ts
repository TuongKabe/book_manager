import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
  SignIn,
  Camera,
  Archive,
  ShoppingBag,
  Receipt,
  ChartLineUp,
  PencilSimple,
  WarningCircle,
} from "@phosphor-icons/react";

type IconCmp = ComponentType<IconProps>;

export type Workflow = {
  id: string;
  number: number;
  shortTitle: string;
  title: string;
  purpose: string;
  whenToUse: string;
  steps: string[];
  notes: string[];
  ctaLabel: string;
  ctaHref: string;
  icon: IconCmp;
};

export const WORKFLOWS: Workflow[] = [
  {
    id: "dang-nhap",
    number: 1,
    shortTitle: "Đăng nhập",
    title: "Đăng nhập lần đầu",
    purpose: "Truy cập vào hệ thống quản lý.",
    whenToUse: "Mỗi khi mở trình duyệt vào BookBase.",
    steps: [
      "Mở trình duyệt, truy cập địa chỉ web của BookBase.",
      'Ở trang đăng nhập, nhập mã truy cập (passcode) mà chủ hiệu đã cấp vào ô "Mã truy cập".',
      'Nhấn nút Vào.',
      'Nếu nhập đúng, hệ thống chuyển vào trang Tổng quan. Nếu sai, sẽ hiện dòng đỏ "Mã truy cập không đúng".',
    ],
    notes: [
      "Mã truy cập là dãy ký tự bất kỳ do chủ hiệu đặt. Không có chức năng quên mật khẩu trên app — liên hệ chủ hiệu nếu quên.",
      "Phiên đăng nhập giữ trong trình duyệt — không cần nhập lại mỗi lần mở tab mới. Khi muốn thoát hẳn, bấm Đăng xuất ở góc dưới sidebar.",
    ],
    ctaLabel: "→ Mở trang Đăng nhập",
    ctaHref: "/login",
    icon: SignIn,
  },
  {
    id: "nhap-nhanh",
    number: 2,
    shortTitle: "Nhập nhanh",
    title: "Nhập nhanh 1 cuốn sách vào kho (quét ISBN)",
    purpose: "Thêm 1 cuốn sách vào kho mà không cần tạo lô nhập hàng.",
    whenToUse: "Khi có sách lẻ cần đưa lên kho ngay (khách mang sách đến bán, sách biếu tặng, sách nhặt được...). Không qua nhà cung cấp.",
    steps: [
      "Trên sidebar, bấm Nhập nhanh (biểu tượng camera).",
      "Bấm Bật camera — trình duyệt sẽ hỏi quyền truy cập camera. Chọn Cho phép.",
      "Đưa mã vạch trên bìa sau sách vào khung hình. Khi quét được, mã ISBN sẽ hiện lên và form bên dưới tự động điền thông tin từ Google Books (tên sách, tác giả, thể loại, ảnh bìa, mô tả).",
      "Kiểm tra lại thông tin — đặc biệt là tình trạng sách (chọn: Mới / Như mới / Rất tốt / Tốt / Khá / Kém) và giá bán niêm yết (VNĐ).",
      'Bấm Lưu vào kho. Sách sẽ xuất hiện trong Kho sách với trạng thái "Nhập kho".',
    ],
    notes: [
      'Nếu không có mã vạch hoặc camera hỏng, nhập tay ISBN vào ô "Nhập ISBN thủ công" rồi bấm Tra cứu.',
      'Thể loại sách được tự động map sang tiếng Việt (vd: "Fiction" → "Tiểu thuyết", "Textbook" → "Giáo trình"). Có thể sửa nếu muốn.',
      "Sách sau khi lưu có trạng thái Nhập kho. Khi đăng bán, đổi sang Đang bán trong trang Kho sách.",
    ],
    ctaLabel: "→ Mở trang Nhập nhanh",
    ctaHref: "/scan",
    icon: Camera,
  },
  {
    id: "nhap-hang",
    number: 3,
    shortTitle: "Nhập hàng",
    title: "Nhập cả lô hàng từ nhà cung cấp",
    purpose: "Ghi nhận một lần nhập nhiều sách từ cùng nhà cung cấp, kèm chi phí mua và trọng lượng để tính phí ship.",
    whenToUse: "Khi đi mua sách về (mua sỉ, mua đợt, thanh lý...).",
    steps: [
      "Trên sidebar, bấm Nhập hàng (biểu tượng thùng).",
      "Bấm nút + Tạo lô nhập (góc phải).",
      "Điền thông tin lô: Ngày nhập (mặc định hôm nay), Nhà cung cấp (tên người bán hoặc nguồn sách), Tổng chi phí (VNĐ), Trọng lượng cả lô (gram), Ghi chú (điều kiện mua, nợ, v.v.).",
      "Bấm Tiếp tục: thêm sách vào lô.",
      "Quét ISBN từng cuốn (hoặc nhập tay). Mỗi cuốn hiện ra dưới dạng thẻ với: tên, tác giả, ảnh bìa, tình trạng.",
      "Bấm Lưu lô nhập.",
    ],
    notes: [
      "Một lô có thể chứa 1 hoặc nhiều sách. Với sách lẻ không có nguồn rõ ràng, dùng workflow Nhập nhanh.",
      "Có thể sửa lô nhập sau khi tạo: bấm vào lô trong danh sách, thêm/bớt sách, đổi thông tin.",
      "Tổng chi phí lô sẽ được phân bổ vào từng cuốn sách để tính lợi nhuận sau này.",
    ],
    ctaLabel: "→ Mở trang Nhập hàng",
    ctaHref: "/purchases",
    icon: Archive,
  },
  {
    id: "ban-hang",
    number: 4,
    shortTitle: "Bán hàng",
    title: "Bán sách cho khách (tạo đơn hàng)",
    purpose: "Ghi nhận một đơn bán: khách mua sách nào, ship qua đơn vị nào, tổng tiền thu về.",
    whenToUse: "Khi khách đặt mua (online hoặc tại quầy) và đơn đã chốt.",
    steps: [
      "Trên sidebar, bấm Bán hàng (biểu tượng túi mua sắm).",
      "Bấm + Tạo đơn hàng.",
      "Điền thông tin đơn: Ngày bán (mặc định hôm nay), Tên khách, SĐT, Địa chỉ (nếu là đơn ship), Kênh bán (Shopee, Facebook, tại quầy, v.v.).",
      'Ở phần "Thêm sách vào đơn": gõ tên sách hoặc ISBN vào ô tìm kiếm. Hệ thống chỉ hiện sách đang ở trạng thái Đang bán.',
      "Bấm vào sách muốn thêm — sách đó vào danh sách đơn.",
      "Kiểm tra tổng tiền hàng (tự tính), điền phí ship, chọn đơn vị vận chuyển (GHN / GHTK / Viettel Post / J&T / Bưu điện / Khác).",
      "Bấm Lưu đơn. Sách trong đơn tự động chuyển trạng thái sang Đã bán, kèm ngày bán, giá bán, kênh bán.",
    ],
    notes: [
      "Nếu khách trả lại sách sau khi bán, mở đơn → bấm Sửa → bỏ sách đó ra khỏi đơn. Sách sẽ tự quay về trạng thái Đang bán.",
      "Nếu đơn có nhiều sách nhưng khách chỉ mua một phần: tạo 2 đơn riêng thay vì xoá sách khỏi đơn (giữ lịch sử chính xác).",
      "Sửa đơn đã lưu: bấm vào đơn trong danh sách, chỉnh thông tin, bấm Cập nhật.",
    ],
    ctaLabel: "→ Mở trang Bán hàng",
    ctaHref: "/orders",
    icon: ShoppingBag,
  },
  {
    id: "chi-phi",
    number: 5,
    shortTitle: "Chi phí",
    title: "Ghi nhận chi phí phát sinh",
    purpose: "Ghi các khoản chi ngoài tiền mua sách: phí ship nhập, đóng gói, hoa hồng sàn, v.v.",
    whenToUse: "Khi phát sinh khoản chi không gắn với lô nhập cụ thể.",
    steps: [
      "Trên sidebar, bấm Chi phí (biểu tượng biên lai).",
      "Bấm + Thêm chi phí.",
      "Điền: Ngày (mặc định hôm nay), Danh mục (chọn: Vận chuyển / Đóng gói / Phí nền tảng / Khác), Số tiền (VNĐ), Ghi chú (tuỳ chọn).",
      "Bấm Lưu.",
    ],
    notes: [
      "Phí ship khi bán hàng không ghi ở đây — phí đó đã có trong đơn hàng.",
      "Phí ship khi nhập hàng (trả cho người giao sách đến) thì ghi ở đây, danh mục Vận chuyển.",
      "Có thể sửa/xoá chi phí đã lưu: bấm vào dòng tương ứng.",
    ],
    ctaLabel: "→ Mở trang Chi phí",
    ctaHref: "/expenses",
    icon: Receipt,
  },
  {
    id: "bao-cao",
    number: 6,
    shortTitle: "Báo cáo",
    title: "Xem báo cáo doanh thu / lợi nhuận",
    purpose: "Biết trong kỳ (ngày/tuần/tháng/quý/năm) bán được bao nhiêu, chi bao nhiêu, lời bao nhiêu.",
    whenToUse: "Cuối ngày đối chiếu, hoặc khi chủ hiệu hỏi \"tháng này lời bao nhiêu?\".",
    steps: [
      "Trang Tổng quan mở mặc định khi đăng nhập, hiển thị dữ liệu hôm nay.",
      "Để đổi kỳ xem: bấm vào dropdown kỳ (góc phải trên cùng) → chọn: Hôm nay / Tháng này / Tháng trước / Quý này / Quý trước / Năm nay / Năm trước / Tùy chỉnh...",
      "Các chỉ số chính hiển thị: Doanh thu (tổng tiền bán được), Chi phí (gồm tiền mua sách + chi phí phát sinh), Lợi nhuận (doanh thu trừ chi phí), Số sách đã bán, Số đơn hàng, Tồn kho (số sách còn lại chưa bán).",
      "Cuộn xuống xem Top sách bán chạy và lịch sử giao dịch gần đây.",
    ],
    notes: [
      "Chi phí trong dashboard đã tính cả tiền mua sách (tổng purchaseCostVnd của toàn bộ sách), không phải chỉ chi phí phát sinh.",
      "Số liệu cập nhật theo thời gian thực mỗi khi đổi kỳ.",
    ],
    ctaLabel: "→ Mở trang Tổng quan",
    ctaHref: "/",
    icon: ChartLineUp,
  },
  {
    id: "sua-sach",
    number: 7,
    shortTitle: "Sửa sách",
    title: "Sửa / xoá thông tin sách đã nhập",
    purpose: "Đổi giá bán, cập nhật tình trạng, sửa thông tin ISBN, hoặc xoá sách nhập nhầm.",
    whenToUse: "Khi phát hiện sai sót, hoặc cần cập nhật giá bán cho phù hợp thị trường.",
    steps: [
      "Trên sidebar, bấm Kho sách (biểu tượng sách).",
      "Tìm sách cần sửa: gõ tên/tác giả/ISBN vào ô tìm kiếm, hoặc lọc theo trạng thái (Nhập kho / Đang bán / Đã bán).",
      "Bấm vào dòng sách đó → mở form sửa.",
      "Sửa các trường cần thiết (giá bán, tình trạng, ghi chú, ảnh bìa...) → bấm Lưu.",
    ],
    notes: [
      "Không thể xoá sách đã bán (trạng thái SOLD) — để giữ lịch sử bán hàng. Nếu nhập nhầm, sửa thông tin thay vì xoá.",
      "Nếu cần đổi trạng thái Nhập kho → Đang bán nhanh: bấm vào sách, đổi dropdown Trạng thái.",
      "Sửa giá bán nhiều sách cùng lúc: chưa hỗ trợ, phải sửa từng cuốn.",
      "Để xoá sách: bấm vào dòng sách → bấm biểu tượng thùng rác (góc phải form sửa) → xác nhận.",
    ],
    ctaLabel: "→ Mở trang Kho sách",
    ctaHref: "/books",
    icon: PencilSimple,
  },
  {
    id: "isbn-loi",
    number: 8,
    shortTitle: "ISBN lỗi",
    title: "Xử lý khi quét ISBN không ra thông tin",
    purpose: "Vẫn lưu được sách vào kho khi Google Books không có dữ liệu.",
    whenToUse: "Sách cũ nội địa, sách tự xuất bản, sách nước ngoài quá hiếm, hoặc mã vạch mờ không quét được.",
    steps: [
      'Khi quét ISBN hoặc nhập tay, nếu hệ thống báo "Không tìm thấy trên Google Books":',
      'Cách 1 — Nhập tay: Bấm nút "Bỏ qua tra cứu, nhập tay" → điền thủ công: Tên sách, Tác giả, Thể loại, Tình trạng, Giá bán.',
      "Cách 2 — Nhập từng phần: Vẫn lưu ISBN lại (ghi ra giấy), mở Kho sách → bấm + Thêm sách → điền tay toàn bộ.",
      'Nếu ISBN bị báo "ISBN không hợp lệ": kiểm tra lại số — ISBN-10 (10 số) hoặc ISBN-13 (13 số, thường bắt đầu bằng 978 hoặc 979).',
    ],
    notes: [
      "Sách nhập tay vẫn có đầy đủ chức năng như sách quét được: hiện trong kho, thêm vào đơn, bán bình thường.",
      "Lý do phổ biến không tìm được: sách quá cũ (trước 1970), sách nội địa không phát hành quốc tế, sách có mã vạch nhưng không đăng ký ISBN.",
      'Nếu camera quét bị lỗi liên tục: thử nhập tay ISBN vào ô "Nhập ISBN thủ công" trước khi tra cứu.',
    ],
    ctaLabel: "→ Mở trang Nhập nhanh",
    ctaHref: "/scan",
    icon: WarningCircle,
  },
];