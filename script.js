// --- Get references to HTML elements ---
const canvas = document.getElementById('profileCanvas');
const ctx = canvas.getContext('2d');
const imageLoader = document.getElementById('imageLoader');
const textInput = document.getElementById('text-input');
const textColorInput = document.getElementById('text-color');
const bgColor1Input = document.getElementById('bg-color-1');
const bgColor2Input = document.getElementById('bg-color-2');
const bgOpacitySlider = document.getElementById('bg-opacity-slider');
const fontSizeSlider = document.getElementById('font-size-slider');
const zoomSlider = document.getElementById('zoom-slider'); // Get the new zoom slider
const downloadBtn = document.getElementById('downloadBtn');

// --- State variables for image manipulation ---
let uploadedImage = null;
let imageState = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    scale: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
};

// --- Event Listeners ---
imageLoader.addEventListener('change', handleImageUpload);
textInput.addEventListener('input', redrawCanvas);
textColorInput.addEventListener('input', redrawCanvas);
bgColor1Input.addEventListener('input', redrawCanvas);
bgColor2Input.addEventListener('input', redrawCanvas);
bgOpacitySlider.addEventListener('input', redrawCanvas);
fontSizeSlider.addEventListener('input', redrawCanvas);
zoomSlider.addEventListener('input', handleZoom); // Listen for slider changes
downloadBtn.addEventListener('click', downloadImage);

// Canvas listeners for image dragging
canvas.addEventListener('mousedown', (e) => {
    if (!uploadedImage) return; // Don't drag if no image
    imageState.isDragging = true;
    imageState.dragStartX = e.clientX - imageState.x;
    imageState.dragStartY = e.clientY - imageState.y;
});
canvas.addEventListener('mouseup', () => imageState.isDragging = false);
canvas.addEventListener('mouseout', () => imageState.isDragging = false);
canvas.addEventListener('mousemove', (e) => {
    if (imageState.isDragging && uploadedImage) {
        imageState.x = e.clientX - imageState.dragStartX;
        imageState.y = e.clientY - imageState.dragStartY;
        redrawCanvas();
    }
});

// --- Main Functions ---

/**
 * Handles zoom slider input.
 */
function handleZoom() {
    if (uploadedImage) {
        imageState.scale = parseFloat(zoomSlider.value);
        redrawCanvas();
    }
}

function handleImageUpload(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedImage = new Image();
        uploadedImage.onload = () => {
            // Reset image state on new upload
            const canvasCenter = canvas.width / 2;
            imageState = { ...imageState, x: canvasCenter, y: canvasCenter, scale: 1 };
            zoomSlider.value = 1; // Also reset the slider's UI position
            redrawCanvas();
        }
        uploadedImage.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (uploadedImage) {
        drawImageWithTransformations();
    }
    const text = textInput.value;
    if (text) {
        const textColor = textColorInput.value;
        const bgColor1 = bgColor1Input.value;
        const bgColor2 = bgColor2Input.value;
        const bgOpacity = parseFloat(bgOpacitySlider.value);
        const fontSize = parseInt(fontSizeSlider.value);
        drawCurvedText(text, textColor, { color1: bgColor1, color2: bgColor2, opacity: bgOpacity }, fontSize);
    }
}

function drawImageWithTransformations() {
    ctx.save();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.clip();

    const imgWidth = uploadedImage.width * imageState.scale;
    const imgHeight = uploadedImage.height * imageState.scale;

    ctx.drawImage(uploadedImage, imageState.x - imgWidth / 2, imageState.y - imgHeight / 2, imgWidth, imgHeight);

    ctx.restore();
}


/**
 * Draws the curved text and its background.
 * @param {string} text - The text to draw.
 * @param {string} textColor - The color of the text.
 * @param {object} bgConfig - Configuration for the background {color1, color2, opacity}.
 * @param {number} fontSize - The font size in pixels.
 */
function drawCurvedText(text, textColor, bgConfig, fontSize) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const bannerHeight = fontSize * 1.5;
    const textRadius = (canvas.width / 2) - (bannerHeight / 2);

    // The full available arc for the background banner
    const arcStartAngle = (1 / 3) * Math.PI; // 5 o'clock
    const arcEndAngle = (3 / 3) * Math.PI;   // 9 o'clock

    // --- Draw the background arc/banner first (it still spans the full 5-to-9 range) ---
    ctx.save();
    
    const bannerRightX = centerX + Math.cos(arcStartAngle) * textRadius;
    const bannerLeftX = centerX + Math.cos(arcEndAngle) * textRadius;
    const gradient = ctx.createLinearGradient(bannerLeftX, 0, bannerRightX, 0);

    gradient.addColorStop(0, hexToRgba(bgConfig.color1, bgConfig.opacity));
    gradient.addColorStop(1, hexToRgba(bgConfig.color2, bgConfig.opacity));

    ctx.beginPath();
    ctx.arc(centerX, centerY, textRadius, arcStartAngle, arcEndAngle, false);
    ctx.lineWidth = bannerHeight;
    ctx.strokeStyle = gradient;
    ctx.stroke();
    ctx.restore();
    
    // --- Draw the text using a more precise centering method ---
    ctx.globalAlpha = 1;
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // *** FIX: Reverse the string to correct the drawing order ***
    const reversedText = text.split('').reverse().join('');

    // Step 1: Calculate the total angle the entire text string will occupy.
    const totalTextWidth = ctx.measureText(reversedText).width;
    const totalTextAngle = totalTextWidth / textRadius; // angle = arcLength / radius

    // Step 2: Calculate the starting angle to center this text block within the available arc.
    const arcCenterAngle = (arcStartAngle + arcEndAngle) / 2;
    let currentAngle = arcCenterAngle - (totalTextAngle / 2);

    // Step 3: Draw each character of the reversed string sequentially.
    for (let i = 0; i < reversedText.length; i++) {
        const char = reversedText[i];
        
        const charWidth = ctx.measureText(char).width;
        const charAngle = charWidth / textRadius;
        
        const angleForChar = currentAngle + (charAngle / 2);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angleForChar);
        ctx.translate(textRadius, 0);
        ctx.rotate(-Math.PI / 2); 
        ctx.fillText(char, 0, 0);
        ctx.restore();
        
        currentAngle += charAngle;
    }
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'profile-picture.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Initial draw to show the empty canvas
redrawCanvas();