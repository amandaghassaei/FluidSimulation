import { GLCompute } from 'glcompute';
import MicroModal from 'micromodal';

export const canvas = document.getElementById('glcanvas') as HTMLCanvasElement;
export const glcompute = new GLCompute(null, canvas, {antialias: true}, (message: string) => {
	// Show error modal.
	MicroModal.show('modal-2');
	const errorEl = document.getElementById('glErrorMsg');
	if (errorEl) errorEl.innerHTML =`Error: ${message}`;
	const coverImg = document.getElementById('coverImg');
	if (coverImg) coverImg.style.display = 'block';
});