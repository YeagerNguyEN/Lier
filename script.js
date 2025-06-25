document.addEventListener("DOMContentLoaded", () => {
  // Lấy các phần tử cần thiết
  const scanButton = document.getElementById("scan-button");
  const secretTrigger = document.getElementById("secret-trigger");
  const displayContent = document.getElementById("display-content");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const recordModal = document.getElementById("record-modal");
  const recordButton = document.getElementById("record-button");
  const recordTimerDisplay = recordModal.querySelector(".record-timer");
  const recordMessage = document.createElement("p"); // Tạo một phần tử để hiển thị thông báo ghi âm
  recordMessage.classList.add("record-message");
  recordModal.querySelector(".modal-content").appendChild(recordMessage);

  // Biến trạng thái
  let isScanning = false;
  let forceTruthNext = false;
  let recordingTimer = null;
  let recordingDuration = 0; // Giây
  const MIN_RECORD_DURATION = 1; // Thời gian ghi âm tối thiểu (giây)

  // Hàm tiện ích sleep để tạo độ trễ, thay thế cho setTimeout lồng nhau
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Hàm để thêm hiệu ứng gõ chữ
  const typeText = async (element, text, className, speed = 50) => {
    element.innerHTML = `<div class="status-text ${className}"></div>`;
    const targetElement = element.querySelector(".status-text");
    targetElement.textContent = ""; // Đảm bảo nội dung rỗng ban đầu

    // Để hiệu ứng gõ chữ hoạt động tốt với xuống dòng, ta gõ từng ký tự
    // Tuy nhiên, để đơn giản và tránh lỗi phức tạp với CSS animation,
    // ta sẽ dùng textContent và điều khiển hiệu ứng typing bằng JS.
    // CSS sẽ thêm con trỏ nhấp nháy.

    let i = 0;
    // Bọc văn bản trong một span để áp dụng typing effect CSS
    const typingSpan = document.createElement("span");
    typingSpan.classList.add("typing-effect");
    targetElement.appendChild(typingSpan);

    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (i < text.length) {
          typingSpan.textContent += text.charAt(i);
          i++;
        } else {
          clearInterval(interval);
          typingSpan.classList.add("completed"); // Đánh dấu là hoàn thành để ẩn con trỏ
          resolve();
        }
      }, speed);
    });
    // Đảm bảo con trỏ biến mất sau khi hoàn thành
    typingSpan.classList.add("completed");
  };

  // Lắng nghe nút bí mật
  secretTrigger.addEventListener("click", () => {
    if (isScanning) return; // Không cho kích hoạt khi đang quét
    forceTruthNext = true;
    console.log('Hệ thống được hiệu chỉnh. Kết quả tiếp theo sẽ là "SỰ THẬT".');
    const originalContent = displayContent.innerHTML; // Lưu trạng thái hiện tại
    // Hiển thị nhanh thông báo hiệu chỉnh
    typeText(displayContent, "HIỆU CHỈNH KÍCH HOẠT", "analyzing", 40);
    setTimeout(() => {
      // Chỉ reset về "HỆ THỐNG SẴN SÀNG" nếu không đang trong quá trình ghi âm hoặc quét
      if (!isScanning && recordModal.classList.contains("hidden")) {
        resetScanner();
      } else {
        // Nếu đang trong quá trình khác, phục hồi nội dung gốc sau khi thông báo biến mất
        displayContent.innerHTML = originalContent;
      }
    }, 1500);
  });

  // Lắng nghe nút quét chính
  scanButton.addEventListener("click", () => {
    if (isScanning) return;
    showRecordModal();
  });

  // Hàm cập nhật trạng thái trên màn hình với hiệu ứng gõ chữ
  const updateStatus = async (text, className, speed = 50) => {
    await typeText(displayContent, text, className, speed);
  };

  // --- Quá trình thu âm giả lập ---
  const showRecordModal = () => {
    recordModal.classList.remove("hidden");
    recordTimerDisplay.textContent = "00:00";
    recordingDuration = 0;
    recordMessage.textContent = "";
    recordMessage.classList.remove("active"); // Ẩn thông báo lỗi

    // Gán sự kiện chỉ một lần để tránh lặp lại
    recordButton.onmousedown = startRecording;
    recordButton.onmouseup = stopRecording;
    recordButton.onmouseleave = stopRecordingIfRecording; // Dừng nếu chuột rời nút khi đang giữ
    recordButton.ontouchstart = startRecording;
    recordButton.ontouchend = stopRecording;
    recordButton.ontouchcancel = stopRecordingIfRecording; // Dừng nếu chạm bị hủy
  };

  const hideRecordModal = () => {
    recordModal.classList.add("hidden");
    recordButton.classList.remove("recording");
    clearInterval(recordingTimer);
    recordingTimer = null;
    // Xóa bỏ sự kiện để tránh rò rỉ bộ nhớ hoặc hành vi không mong muốn
    recordButton.onmousedown = null;
    recordButton.onmouseup = null;
    recordButton.onmouseleave = null;
    recordButton.ontouchstart = null;
    recordButton.ontouchend = null;
    recordButton.ontouchcancel = null;
  };

  const startRecording = (event) => {
    // Chỉ cho phép bắt đầu ghi âm nếu không đang quét và chưa có timer nào chạy
    if (isScanning || recordingTimer) return;

    // Ngăn chặn hành vi mặc định của trình duyệt (ví dụ: kéo ảnh)
    event.preventDefault();

    recordButton.classList.add("recording");
    recordingDuration = 0;
    recordTimerDisplay.textContent = "00:00";
    recordMessage.textContent = "ĐANG GHI ÂM...";
    recordMessage.classList.add("active");
    // TODO: Phát âm thanh bắt đầu ghi âm
    recordingTimer = setInterval(() => {
      recordingDuration++;
      const minutes = String(Math.floor(recordingDuration / 60)).padStart(
        2,
        "0"
      );
      const seconds = String(recordingDuration % 60).padStart(2, "0");
      recordTimerDisplay.textContent = `${minutes}:${seconds}`;
    }, 1000);
  };

  const stopRecording = () => {
    if (!recordingTimer) return; // Không làm gì nếu chưa ghi âm

    clearInterval(recordingTimer);
    recordingTimer = null; // Đặt lại timer về null ngay lập tức
    recordButton.classList.remove("recording");
    recordMessage.classList.remove("active");
    // TODO: Phát âm thanh dừng ghi âm

    if (recordingDuration < MIN_RECORD_DURATION) {
      recordMessage.textContent = `VUI LÒNG GIỮ NÚT ÍT NHẤT ${MIN_RECORD_DURATION} GIÂY.`;
      recordMessage.classList.add("active");
      // Hiển thị thông báo lỗi một lúc rồi reset modal
      setTimeout(() => {
        recordMessage.classList.remove("active");
        recordMessage.textContent = "";
        recordTimerDisplay.textContent = "00:00";
      }, 2500); // Tăng thời gian hiển thị thông báo lỗi
      // Giữ modal mở để người dùng thử lại
      recordingDuration = 0; // Reset thời gian ghi âm
      // Không ẩn modal, chỉ reset trạng thái để có thể ghi âm lại
    } else {
      // Nếu ghi âm đủ dài, ẩn modal và bắt đầu phân tích
      hideRecordModal();
      startScanSequence();
    }
  };

  // Hàm này dùng cho onmouseleave/ontouchcancel, chỉ dừng nếu đang ghi âm
  const stopRecordingIfRecording = () => {
    if (recordingTimer) {
      // Kiểm tra xem timer có đang chạy không
      stopRecording();
    }
  };

  // Hàm chính điều khiển chuỗi sự kiện quét
  const startScanSequence = async () => {
    isScanning = true;
    scanButton.disabled = true;
    scanButton.querySelector("span").textContent = "Đang Quét";
    // TODO: Phát âm thanh khởi động hệ thống

    // 1. Giai đoạn khởi tạo
    await updateStatus("ĐANG KHỞI TẠO HỆ THỐNG...", "analyzing", 40);
    progressContainer.classList.remove("hidden");
    progressBar.style.width = "0%";
    await sleep(500); // Đợi một chút sau khi gõ xong
    progressBar.style.width = "20%";
    // TODO: Phát âm thanh loading

    // 2. Giai đoạn thu nhận dữ liệu giọng nói
    await sleep(1500);
    await updateStatus(
      "THU NHẬN VÀ XỬ LÝ DỮ LIỆU GIỌNG NÓI...",
      "analyzing",
      40
    );
    progressBar.style.width = "40%";
    await sleep(2000);

    // 3. Giai đoạn phân tích
    await updateStatus(
      "PHÂN TÍCH BIẾN ĐỘNG CẢM XÚC VÀ ĐỘ CHÍNH XÁC...",
      "analyzing",
      40
    );
    progressBar.style.width = "65%";
    await sleep(2500);

    await updateStatus(
      "ĐỐI CHIẾU MẪU DỮ LIỆU CHÉO VỚI CƠ SỞ DỮ LIỆU CHÍNH...",
      "analyzing",
      40
    );
    progressBar.style.width = "85%";
    await sleep(2000);

    await updateStatus(
      "HOÀN TẤT PHÂN TÍCH VÀ ĐÁNH GIÁ KẾT QUẢ...",
      "analyzing",
      40
    );
    progressBar.style.width = "100%";
    await sleep(1000);

    // 4. Hiển thị kết quả
    progressContainer.classList.add("hidden");
    // TODO: Phát âm thanh kết quả

    if (forceTruthNext) {
      await updateStatus("SỰ THẬT", "truth", 60); // Nhanh hơn một chút cho kết quả
      forceTruthNext = false; // Reset lại trạng thái gian lận
    } else {
      await updateStatus("GIAN DỐI", "lie", 60); // Nhanh hơn một chút cho kết quả
    }

    // 5. Reset lại giao diện sau một khoảng thời gian
    await sleep(5000); // Thời gian hiển thị kết quả
    resetScanner();
  };

  const resetScanner = () => {
    updateStatus("HỆ THỐNG SẴN SÀNG", "initial", 50);
    scanButton.disabled = false;
    scanButton.querySelector("span").textContent = "Bắt Đầu Quét";
    progressBar.style.width = "0%";
    isScanning = false;
  };

  // Khởi tạo trạng thái ban đầu khi tải trang
  resetScanner();
});
