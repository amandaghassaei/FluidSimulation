import { GUI } from 'dat.gui';
import { gcodeExportState, generateNewSVGParticles, generateNewSVGTrails, guiState, svgExportState } from './exports';
import { canvas } from './gl';

const gui = new GUI({width: 400});
gui.add(guiState, 'Regenerate');
gui.add(guiState, 'Num Particles', 1, undefined, 1).onFinishChange(generateNewSVGParticles);
gui.add(guiState, 'Trail Length', 1, undefined, 1).onFinishChange(generateNewSVGTrails);
gui.add(guiState, 'Trail Subsampling', 1, undefined, 1).onFinishChange(generateNewSVGTrails);

const saveSVGFolder = gui.addFolder(`SVG export`);
saveSVGFolder.open();
saveSVGFolder.add(svgExportState, 'Min Segment Length (pt)', 0, undefined, .001);
saveSVGFolder.add(svgExportState, 'Save SVG');

const saveGcodeFolder = gui.addFolder(`Gcode export`);
saveGcodeFolder.open();

const widthController = saveGcodeFolder.add(gcodeExportState, 'Width (in)', 0, undefined, 0.001);
const heightController = saveGcodeFolder.add(gcodeExportState, 'Height (in)', 0, undefined, 0.001);
// Preserve aspect ratio when editing width/height.
widthController.onFinishChange(() => {
	heightController.setValue(gcodeExportState['Width (in)'] / canvas.clientWidth * canvas.clientHeight);
});
heightController.onFinishChange(() => {
	widthController.setValue(gcodeExportState['Height (in)'] / canvas.clientHeight * canvas.clientWidth);
});
saveGcodeFolder.add(gcodeExportState, 'Min Segment Length (in)', 0, undefined, .001);
saveGcodeFolder.add(gcodeExportState, 'Retract Height (in)', 0, undefined, .001);
saveGcodeFolder.add(gcodeExportState, 'Draw Height (in)', 0, undefined, .001);
saveGcodeFolder.add(gcodeExportState, 'Feed Rate (ipm)', 0, undefined, 0.5);
saveGcodeFolder.add(gcodeExportState, 'Save Gcode');


export function hideGUI() {
	gui.hide();
}

export function showGUI() {
	gui.show();
	generateNewSVGParticles();
}

hideGUI(); // Invisible to start

export function guiOnResize(width: number, height: number) {
	widthController.setValue(width / 72);
	heightController.setValue(height / 72);
}