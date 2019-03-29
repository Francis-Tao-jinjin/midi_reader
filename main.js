var soundFile = soundData.split(',')[1];
var data = window.atob(soundFile);


var midiData = MidiFile(data);