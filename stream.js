function Stream(str) {
    var position = 0;

    function read(length)    {
        var result = str.substr(position, length);
        position += length;
        return result;
    }

    function readInt32() {
        var result = (
            (str.charCodeAt(position) << 24)
            + (str.charCodeAt(position + 1) << 16)
            + (str.charCodeAt(position + 2) << 8)
            + str.charCodeAt(position + 3));
        position += 4;
        return result;
    }

    function readInt16() {
        var result = (
            (str.charCodeAt(position) << 8)
            + str.charCodeAt(position + 1));
        position += 2;
        return result;
    }

    function readInt8(signed) {
        var result = str.charCodeAt(position);
        if (signed && result > 127) {
            result -= 256;
        }
        position += 1;
        return result;
    }

    function eof() {
        return position >= str.length;
    }

    function readVarInt() {
        var result = 0;
        while(true) {
            var b = readInt8();
            // 首字节如果是 1 表示后面还有字节
            if (b & 0x80) { // 0x80 = 128
                result += (b & 0x7f);
                result <<= 7;
            } else {
                return result + b;
            }
        }
    }

    return {
        eof,
        read,
        readInt8,
        readInt16,
        readInt32,
        readVarInt,
    }
}



