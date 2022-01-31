/// <reference lib="webworker" />

interface Color {
  r: number;
  g: number;
  b: number;
}

// https://stackoverflow.com/a/2541680
function getAverageRGB(data: ImageData): Color {
  const rgb = {r: 0, g: 0, b: 0};
  const blockSize = 5;
  let count = 0;
  let i = -4;

  const length = data.data.length;

  while ((i += blockSize * 4) < length) {
    ++count;
    rgb.r += data.data[i];
    rgb.g += data.data[i + 1];
    rgb.b += data.data[i + 2];
  }

  // ~~ used to floor values
  rgb.r = ~~(rgb.r / count);
  rgb.g = ~~(rgb.g / count);
  rgb.b = ~~(rgb.b / count);

  return rgb;
}

// https://awik.io/determine-color-bright-dark-using-javascript/
function isColorLight({r, g, b}): boolean {
  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  const hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  );

  // Using the HSP value, determine whether the color is light or dark
  return hsp > 127.5;
}

function darkenColor({r, g, b}, percentage): {r: number, g: number, b: number} {
  if (percentage > 1) {
    percentage /= 100;
  }

  const amount = 255 * percentage;

  return {
    r: Math.max(r - amount, 0),
    g: Math.max(g - amount, 0),
    b: Math.max(b - amount, 0)
  };
}

addEventListener('message', async ({data}) => {
  if (data.width && data.height && data.blob) {
    const imageBitmap = await createImageBitmap(data.blob, 0, 0, data.width, data.height);
    // @ts-ignore
    const offscreen = new OffscreenCanvas(data.width, data.height);
    const ctx = offscreen.getContext('2d');

    ctx.drawImage(imageBitmap, 0, 0);
    const colorObj: Color & {darker?: Color; light?: boolean} = getAverageRGB(ctx.getImageData(0, 0, data.width, data.height));
    colorObj.darker = darkenColor(colorObj, .1);
    colorObj.light = isColorLight(colorObj);
    postMessage(colorObj);
    return;
  }

  postMessage(Error('Nope'));
});
