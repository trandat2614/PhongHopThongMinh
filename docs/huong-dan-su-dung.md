# VoxStream - Ung Dung Chuyen Giong Noi Thanh Van Ban Thoi Gian Thuc

## Gioi Thieu

**VoxStream** la mot ung dung web chuyen doi giong noi thanh van ban (Speech-to-Text) hoat dong trong thoi gian thuc. Ung dung duoc xay dung bang React va Next.js, ho tro **Tieng Viet** lam ngon ngu mac dinh, va co the nhan dien nhieu ngon ngu khac nhau.

Ban chi can mo ung dung tren trinh duyet, nhan nut ghi am, va noi — van ban se hien thi ngay lap tuc tren man hinh.

---

## Tinh Nang Chinh

### 1. Nhan Dien Giong Noi Thoi Gian Thuc
- Chuyen doi giong noi thanh van ban ngay khi ban noi
- Ho tro **ket qua tam thoi** (partial) hien thi trong luc dang noi
- **Ket qua cuoi cung** (final) duoc danh dau ro rang khi ban ngung noi

### 2. Ho Tro Tieng Viet Mac Dinh
- Ngon ngu mac dinh la **Tieng Viet (vi-VN)**
- Co the chuyen doi sang cac ngon ngu khac:
  - English (US/UK)
  - Tieng Nhat
  - Tieng Han
  - Tieng Trung (Gian The)
  - Tieng Phap
  - Tieng Duc
  - Tieng Tay Ban Nha
  - Tieng Thai

### 3. Hien Thi Am Thanh Truc Quan
- Thanh song am (audio visualizer) hien thi muc am thanh tu micro cua ban
- 32 thanh tan so duoc ve trong thoi gian thuc bang Canvas

### 4. Trang Thai Ket Noi
- **Offline** — Chua bat dau ghi am
- **Connecting** — Dang ket noi den may chu hoac khoi tao micro
- **Live** — Dang ghi am va nhan dien giong noi
- **Error** — Co loi xay ra (quyen micro, mat ket noi, v.v.)

### 5. Phim Tat Ban Phim
- Nhan phim **Space** (Cach) de bat/tat ghi am nhanh chong

---

## Cach Su Dung

### Buoc 1: Mo Ung Dung
Mo ung dung trong trinh duyet (khuyen nghi dung **Chrome** hoac **Edge** de co ho tro tot nhat).

### Buoc 2: Chon Ngon Ngu
- Tim phan **Language** phia duoi nut ghi am
- Chon **VN Tieng Viet** (mac dinh da duoc chon san)
- Luu y: Ban phai chon ngon ngu **truoc khi** bat dau ghi am

### Buoc 3: Bat Dau Ghi Am
- Nhan vao **nut tron co bieu tuong micro** o giua man hinh
- Hoac nhan phim **Space** tren ban phim
- Trinh duyet se yeu cau **quyen truy cap micro** — hay nhan **Cho phep / Allow**

### Buoc 4: Noi
- Noi ro rang vao micro
- Van ban se xuat hien trong khu vuc **Transcript** phia duoi
- Cac dong van ban co ghi thoi gian ben phai
- Dong co nhan **partial** la ket qua tam thoi, dang duoc xu ly

### Buoc 5: Dung Ghi Am
- Nhan lai nut ghi am hoac nhan **Space**
- Trang thai se chuyen ve **Offline**

### Buoc 6: Xoa Ban Ghi
- Nhan bieu tuong **thung rac** goc tren phai cua khu vuc Transcript de xoa toan bo

---

## Che Do Hoat Dong

### Che Do Trinh Duyet (Browser Speech Recognition)
- Hoat dong **khong can may chu backend**
- Su dung Web Speech API co san trong trinh duyet
- Phu hop de dung ngay, khong can cai dat gi them
- Hien thi thong bao "Browser Speech Recognition" khi dang ghi am

### Che Do WebSocket (Ket Noi May Chu STT)
- Ket noi toi may chu STT thuc (Whisper, Vosk, v.v.) qua WebSocket
- Am thanh duoc ghi o dinh dang: **16 kHz, Mono, 16-bit PCM**
- Gui am thanh moi **1 giay** mot lan
- De su dung che do nay, dat bien moi truong:
  ```
  NEXT_PUBLIC_STT_WS_URL=ws://dia-chi-may-chu:cong/duong-dan
  ```

---

## Yeu Cau He Thong

| Yeu cau | Chi tiet |
|---------|----------|
| Trinh duyet | Chrome 33+, Edge 79+, Safari 14.1+ |
| Micro | Can co micro hoat dong |
| Quyen | Cho phep truy cap micro khi duoc yeu cau |
| Mang | Khong bat buoc (che do trinh duyet hoat dong offline) |

---

## Xu Ly Loi Thuong Gap

| Loi | Nguyen nhan | Cach xu ly |
|-----|-------------|------------|
| "Microphone access denied" | Ban da tu choi quyen micro | Vao cai dat trinh duyet, cho phep quyen micro cho trang web |
| "No microphone found" | Khong tim thay micro | Kiem tra micro da cam va hoat dong |
| "Browser does not support Speech Recognition" | Trinh duyet khong ho tro | Dung Chrome hoac Edge |
| "Connection lost (code: 1006)" | Mat ket noi WebSocket | Kiem tra may chu STT dang chay |

---

## Ghi Chu Ky Thuat

- Ung dung tu dong chon che do trinh duyet khi khong co may chu WebSocket
- Web Speech API tu dong khoi dong lai khi ngung nhan dien (do im lang)
- Moi tai nguyen (micro, AudioContext, WebSocket) deu duoc don dep khi dung ghi am
- Phim Space khong hoat dong khi dang nhap vao o input/textarea/select
