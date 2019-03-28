function MidiFile(data) {

    // midi 文件中由许多小 chunk 组成
    function readChunk(stream) {
        var id = stream.read(4);
        var length = stream.readInt32();
        return {
            id,
            length,
            data: stream.read(length),
        }
    }

    var stream = Stream(data);
    var headerChunk = readChunk(stream);
    if (headerChunk.id != 'MThd' || headerChunk.length != 6) {
        throw 'Bad .mid file, header not found';
    }

    var headerStream = Stream(headerChunk.data);
    var formatType = headerStream.readInt16();
    var trackCount = headerStream.readInt16();
    var timeDivision = headerStream.readInt16();

    var ticksPerBeat;

    if (timeDivision & 0x8000) {
        throw "Expressing time division in SMTPE frames is not supported yet"
    } else {
        ticksPerBeat = timeDivision;
    }
}