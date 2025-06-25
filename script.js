document.addEventListener("DOMContentLoaded", () => {
  // Lấy các phần tử cần thiết
  const scanButton = document.getElementById("scan-button");
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
  let forceLieNext = false; // Mặc định là false
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

    let i = 0;
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
    typingSpan.classList.add("completed");
  };

  // --- EVENT LISTENER CHO DOUBLE-CLICK / DOUBLE-TAP (ẨN) ---
  document.body.addEventListener("dblclick", () => {
    // Ngăn không cho thay đổi chế độ khi đang quét
    if (isScanning) return;

    forceLieNext = !forceLieNext; // Đảo ngược trạng thái

    // Không hiển thị bất kỳ thông báo nào trên giao diện người dùng
    if (forceLieNext) {
      console.log("Chế độ: GIAN DỐI (Đã kích hoạt)"); // Ghi log vào console để kiểm tra
    } else {
      console.log("Chế độ: BÌNH THƯỜNG (Đã tắt)"); // Ghi log vào console để kiểm tra
    }
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
    recordButton.onmouseleave = stopRecordingIfRecording;
    recordButton.ontouchstart = startRecording;
    recordButton.ontouchend = stopRecording;
    recordButton.ontouchcancel = stopRecordingIfRecording;
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
    if (isScanning || recordingTimer) return;
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
    if (!recordingTimer) return;

    clearInterval(recordingTimer);
    recordingTimer = null;
    recordButton.classList.remove("recording");
    recordMessage.classList.remove("active");
    // TODO: Phát âm thanh dừng ghi âm

    if (recordingDuration < MIN_RECORD_DURATION) {
      recordMessage.textContent = `VUI LÒNG GIỮ NÚT ÍT NHẤT ${MIN_RECORD_DURATION} GIÂY.`;
      recordMessage.classList.add("active");
      setTimeout(() => {
        recordMessage.classList.remove("active");
        recordMessage.textContent = "";
        recordTimerDisplay.textContent = "00:00";
      }, 2500);
      recordingDuration = 0;
    } else {
      hideRecordModal();
      startScanSequence();
    }
  };

  const stopRecordingIfRecording = () => {
    if (recordingTimer) {
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
    await sleep(500);
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

    if (forceLieNext) {
      // Nếu forceLieNext là true, luôn hiển thị "GIAN DỐI"
      await updateStatus("GIAN DỐI", "lie", 60);
    } else {
      // Ngược lại, hiển thị "SỰ THẬT"
      await updateStatus("SỰ THẬT", "truth", 60);
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
