// 사진·영상을 브라우저에서 작게 줄여 저장·전송할 수 있는 형태(JPEG data URL)로 바꿉니다.

const MAX_SIDE = 480;

function draw(source: CanvasImageSource, width: number, height: number, quality = 0.78) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** 주소(또는 data URL)의 사진을 작게 줄여요 (JPEG data URL) */
export function shrinkSrc(src: string) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(draw(img, img.width, img.height));
    img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
    img.src = src;
  });
}

/** 사진 한 장을 작게 줄여요. */
export function shrinkPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(draw(img, img.width, img.height));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없어요"));
    };
    img.src = url;
  });
}

/**
 * 영상에서 고르게 몇 장면을 뽑아 사진으로 만들어요.
 * (Claude API는 영상 파일을 직접 받지 않아서, 장면 사진으로 바꿔 보내요.)
 */
export function videoFrames(file: File, count = 4) {
  return new Promise<string[]>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상을 읽을 수 없어요"));
    };
    const seek = (time: number) =>
      new Promise<void>((done) => {
        video.onseeked = () => done();
        video.currentTime = time;
      });
    video.onerror = fail;
    video.onloadeddata = async () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const frames: string[] = [];
        for (let i = 1; i <= count; i++) {
          await seek((duration * i) / (count + 1));
          frames.push(draw(video, video.videoWidth, video.videoHeight, 0.72));
        }
        URL.revokeObjectURL(url);
        resolve(frames);
      } catch {
        fail();
      }
    };
    video.src = url;
  });
}
