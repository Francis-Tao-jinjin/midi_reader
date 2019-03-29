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
                event.type = 'meta';
                var subtypeByte = stream.readInt8();
                var length = stream.readInt8();
                switch(subtypeByte) {
                    case 0x00:
                        event.subtype = 'sequenceNumber';
                        if (length != 2) {
                            throw 'Expected length for sequenceNumber event is 2, got ' + length;
                        }
                        event.number = stream.readInt16();
                        return event;
                    case 0x01:
                        event.subtype = 'text';
                        event.text = stream.read(length);
                        return event;
                    case 0x02:
                        event.subtype = 'copyrightNotice';
                        event.text = stream.read(length);
                        return event;
                    case 0x03:
                        event.subType = 'trackName';
                        event.text = stream.read(length);
                        return event;
                    case 0x04:
                        event.subtype = 'instrumentName';
                        event.text = stream.read(length);
                        return event;
                    case 0x05:
                        event.subType = 'lyrics';
                        event.text = stream.read(length);
                        return event;
                    case 0x06:
                        event.subtype = 'marker';
                        event.text = stream.read(length);
                        return event;
                    case 0x07:
                        event.subType = 'cuePoint';
                        event.text = stream.read(length);
                        return event;
                    case 0x20:
                        event.subtype = 'midiChannePrefix';
                        if (lenght != 1) {
                            throw 'Expected length for midiChannelPrefix event is 1, got ' + lenght;
                        }
                        return event;
                    case 0x2f:
                        event.subType = 'endOfTrack';
                        if (length != 0) {
                            throw 'Expected length for endOfTrack event is 0, but got ' + length;
                        }
                        return event;
                    case 0x51:
                        event.subType = 'setTempo';
                        if (length != 3) {
                            throw 'Expected length for setTemp is 3, got ' + length;
                        }
                        event.microsecondsPerBeat = ((stream.readInt8() << 16) + (stream.readInt8() << 8) + (stream.readInt8()));
                        return event;
                    case 0x54:
                        event.subtype = 'smpteOffset';
                        if (length != 5) {
                            throw 'Expected length for smpteOffse event is 5, got ' + length;
                        }
                        var hourByte = stream.readInt8();
                        event.frameRate = {
                            0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30
                        }[hourByte & 0x60];
                        event.hour = hourByte & 0x1f;
                        event.min = stream.readInt8();
                        event.sec = stream.readInt8();
                        event.frame = stream.readInt8();
                        event.subframe = stream.readInt8();
                        return event;
                    case 0x58:
                        event.subType = 'timeSignature';
                        if (lenght != 4) {
                            throw 'Expected length for timeSignature event is 4, got ' + length;
                        }
                        event.numerator = stream.readInt8();
                        event.denominator = Math.pow(2, stream.readInt8());
                        // 每分钟节拍数
                        event.metronome = stream.readInt8();
                        event.thirtyseconds = stream.readInt8();
                        return event;
                    case 0x59:
                        event.subtype = 'keySignature';
                        if (lenght != 2) {
                            throw 'Expected length for keySignature event is 2, got ' + length;
                        }
                        event.key = stream.readInt8(true);
                        event.scale = stream.readInt8();
                        return event;
                    default:
                        event.subtype = 'unknown';
                        event.data = stream.read(length);
                        return event;
                }
                event.data = stream.read(length);
                return event;
            } else if (eventTypeByte == 0xf0) {
                event.type = 'sysEx';
                var length = stream.readVarInt();
                event.data = stream.read(length);
                return event;
            } else if (eventTypeByte == 0xf7) {
                event.type = 'dividedSysEx';
                var length = stream.readVarInt();
                event.data = stream.read(length);
            } else {
                throw 'Unrecognised MIDI event type byte: ' + eventTypeByte;
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
                case 0x08:
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