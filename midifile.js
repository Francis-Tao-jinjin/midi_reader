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

    var lastEventTypeByte;
    // http://www.music.mcgill.ca/~ich/classes/mumt306/StandardMIDIfileformat.html#BM2_2
    function readEvent(stream) {
        var event = {};
        event.deltaTime = stream.readVarInt();
        var eventTypeByte = stream.readInt8();
        if ((eventTypeByte & 0xf0) == 0xf0) { // System Common Messages and System Real-Time Messages
            if (eventTypeByte == 0xff) {

            } else if (eventTypeByte == 0xf0) {

            }
        } else {  // Channel Voice Messages
            // Data Byte 的第一个 byte
            var param1;
            if ((eventTypeByte & 0x80) == 0) {
                param1 = eventTypeByte;
                eventTypeByte = lastEventTypeByte;
            } else {
                param1 = stream.readInt8();
                lastEventTypeByte = eventTypeByte;
            }
            // 前四位是 event 类型， 后四位是 channel 编号
            var eventType = eventTypeByte >> 4;
            event.channel = eventTypeByte & 0x0f;
            event.type = 'channel';
            switch (eventType) {
                case 0x80:
                    event.subType = 'noteOff';
                    event.noteNumber = param1;
                    // dataByte 的第二个字节
                    event.velocity = stream.readInt8();
                    return event;
                case 0x09:
                    event.noteNumber = param1;
                    event.velocity = stream.readInt8();
                    if (event.velocity === 0) {
                        event.subType = 'noteOff';
                    } else {
                        event.subtype = 'noteOn';
                    }
                    return event;
                case 0x0a:
                    event.subType = 'noteAftertouch';
                    event.noteNumber = param1;
                    event.amount = stream.readInt8();
                    return event;
                case 0x0b:
                    event.subtype = 'controller';
                    event.controllerType = param1;
                    event.value = stream.readInt8();
                    return event;
                case 0x0d:
                    event.subtype = 'channelAftertouch';
                    event.amount = param1;
                    return event;
                case 0x0e:
                    event.subType = 'pitchBend';
                    event.value = param1 + (stream.readInt8() << 7);
                    return event;
                default:
                    throw 'Unrecognised MIDI event type: ' + eventType;
            }
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

    var header = {
        formatType,
        trackCount,
        ticksPerBeat,
    };

    var tracks = [];
    for (var i = 0; i < header.trackCount; i++) {
        tracks[i] = [];
        var trackChunk = readChunk(stream);
        if (trackChunk.id != 'MTrk') {
            throw "Unexpected chunk - expected MTrk, got " + trackChunk.id;
        }
        var trackStream = Stream(trackChunk.data);
        while (!trackStream.eof()) {
            var event = readEvent(trackStream);
            tracks[i].push(event);
        }
    }

    return {
        header,
        tracks,
    };
}