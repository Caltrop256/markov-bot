class CharStream {
    pos = 0;
    ln = 1;
    col = 0;

    constructor(inp) {
        this.inp = inp;
    }

    next() {
        const char = this.inp.charAt(this.pos++);
        if(char == '\n') {
            this.ln += 1;
            this.col = 0;
        } else this.col += 1;
        return char;
    }

    peek() {
        return this.inp.charAt(this.pos);
    }

    eof() {
        return !this.peek();
    }
}

function SparseMatrix(from = {data: [], size1d: 0}) {
    const items = new Map(from.data);
    let size1d = from.size1d;
    let size = size1d * size1d;

    function grow(delta) {
        const newSize1d = size1d + delta;
        const pairs = Array.from(items);
        const newItems = new Map();
        for(const [key, value] of pairs) {
            const x = key % size1d;
            const y = Math.trunc(key / size1d);
            newItems.set(y * newSize1d + x, value);
            items.delete(key);
        }
        for(const [key, value] of newItems) items.set(key, value);
        size1d = newSize1d;
        size = size1d * size1d;
    }

    function serialize() {
        return {
            data: Array.from(items),
            size1d, size
        }
    }

    return new Proxy(Object.create(null), {
        get(target, prop, receiver) {
            const ind = Math.trunc(Number(prop));
            if(ind != ind) {
                switch(prop) {
                    case 'grow' : return grow;
                    case 'serialize' : return serialize;
                    case 'size' : return size;
                    case 'size1d' : return size1d;
                    default : throw new ReferenceError('Invalid property: "' + prop + "!");
                }
            } else {
                if(ind < 0 || ind >= size) throw new RangeError('Index out of bounds!: ' + ind);
                if(items.has(ind)) return items.get(ind);
                else return 0;
            }
        },

        set(target, prop, value) {
            const ind = Math.trunc(Number(prop));
            if(ind != ind) throw new Error('Matrix internals are constants!');
            if(ind < 0 || ind >= size) throw new RangeError('Index out of bounds!: ' + ind);
            items.set(ind, value);
            return true;
        }
    });
};

class Markov {
    static matchContiniously = '\0';
    static whitespace = /[\s]+/;
    static punctuation = /[!-/:-@[-`{-~¡-©«-¬®-±´¶-¸»¿×÷˂-˅˒-˟˥-˫˭˯-˿͵;΄-΅·϶҂՚-՟։-֊־׀׃׆׳-״؆-؏؛؞-؟٪-٭۔۩۽-۾܀-܍߶-߹।-॥॰৲-৳৺૱୰௳-௺౿ೱ-ೲ൹෴฿๏๚-๛༁-༗༚-༟༴༶༸༺-༽྅྾-࿅࿇-࿌࿎-࿔၊-၏႞-႟჻፠-፨᎐-᎙᙭-᙮᚛-᚜᛫-᛭᜵-᜶។-៖៘-៛᠀-᠊᥀᥄-᥅᧞-᧿᨞-᨟᭚-᭪᭴-᭼᰻-᰿᱾-᱿᾽᾿-῁῍-῏῝-῟῭-`´-῾\u2000-\u206e⁺-⁾₊-₎₠-₵℀-℁℃-℆℈-℉℔№-℘℞-℣℥℧℩℮℺-℻⅀-⅄⅊-⅍⅏←-⏧␀-␦⑀-⑊⒜-ⓩ─-⚝⚠-⚼⛀-⛃✁-✄✆-✉✌-✧✩-❋❍❏-❒❖❘-❞❡-❵➔➘-➯➱-➾⟀-⟊⟌⟐-⭌⭐-⭔⳥-⳪⳹-⳼⳾-⳿⸀-\u2e7e⺀-⺙⺛-⻳⼀-⿕⿰-⿻\u3000-〿゛-゜゠・㆐-㆑㆖-㆟㇀-㇣㈀-㈞㈪-㉃㉐㉠-㉿㊊-㊰㋀-㋾㌀-㏿䷀-䷿꒐-꓆꘍-꘏꙳꙾꜀-꜖꜠-꜡꞉-꞊꠨-꠫꡴-꡷꣎-꣏꤮-꤯꥟꩜-꩟﬩﴾-﴿﷼-﷽︐-︙︰-﹒﹔-﹦﹨-﹫！-／：-＠［-｀｛-･￠-￦￨-￮￼-�]|\ud800[\udd00-\udd02\udd37-\udd3f\udd79-\udd89\udd90-\udd9b\uddd0-\uddfc\udf9f\udfd0]|\ud802[\udd1f\udd3f\ude50-\ude58]|\ud809[\udc00-\udc7e]|\ud834[\udc00-\udcf5\udd00-\udd26\udd29-\udd64\udd6a-\udd6c\udd83-\udd84\udd8c-\udda9\uddae-\udddd\ude00-\ude41\ude45\udf00-\udf56]|\ud835[\udec1\udedb\udefb\udf15\udf35\udf4f\udf6f\udf89\udfa9\udfc3]|\ud83c[\udc00-\udc2b\udc30-\udc93]/;
    static id = {
        pos: {
            start: 0,
            middle: 1,
            end: 2,
            all: 3,
            mask: 3
        },
        space: {
            none: 0,
            before: 8,
            after: 16,
            all: 24,
            mask: 24
        },
        puncMaskBitIndex: 5
    }

    stored = 0;
    nodes = new Map();
    allocationBuffer = 100;
    matrix = new SparseMatrix();
    indexToIdentifier = [];

    constructor() {
        const resolveMess = (all, primary, secondary, none, cond1, cond2) => cond1 && cond2
            ? all
            : cond1
                ? primary
                : cond2
                    ? secondary
                    : none;
        this.getSpaceEnum = resolveMess.bind(null, Markov.id.space.all, Markov.id.space.before, Markov.id.space.after, Markov.id.space.none);
        this.getPosEnum = resolveMess.bind(null, Markov.id.pos.all, Markov.id.pos.start, Markov.id.pos.end, Markov.id.pos.middle);

        this.emptyToken = this.createIdentifier('', Markov.id.pos.all, true, Markov.id.space.before);
    }

    createIdentifier(str, pos, isPunc, space) {
        return String.fromCharCode(
            (pos & Markov.id.pos.mask)
            | space
            | (isPunc << Markov.id.puncMaskBitIndex)
        ) + str;
    }

    append(identifier) {
        this.nodes.set(identifier, this.stored++);
        this.indexToIdentifier.push(identifier);
        if(this.stored > this.matrix.size1d) {
            this.matrix.grow(this.allocationBuffer);
        }
    }

    tokenize(data) {
        const tokens = [];
        const stream = new CharStream(data);

        let start = true;
        let space = false;
        let matchingPunctuation = Markov.punctuation.test(stream.peek());
        let matchingContiniously = false;

        while(!stream.eof()) {
            let word = '';
            let endedWithNewLine = false;
            let endedWithSpace = false;
            let isPunctuation = matchingPunctuation;

            while(!stream.eof()) {
                const char = stream.peek();
                if(char == Markov.matchContiniously) {
                    stream.next();
                    if(matchingContiniously) {
                        if(!stream.eof() && Markov.whitespace.test(stream.peek())) {
                            endedWithSpace = true;
                            if(stream.peek() == '\n') endedWithNewLine = true;
                        }
                    }
                    matchingContiniously = !matchingContiniously;
                    break;
                } else if(!matchingContiniously) {
                    if(Markov.whitespace.test(char)) {
                        if(char == '\n') endedWithNewLine = true;
                        else endedWithSpace = true;
                        while(!stream.eof() && Markov.whitespace.test(stream.peek())) {
                            if(stream.next() == '\n') endedWithNewLine = true;
                        }
                        break;
                    } else if(Markov.punctuation.test(char) != matchingPunctuation) {
                        matchingPunctuation = !matchingPunctuation;
                        break;
                    }
                }
                word += stream.next();
            }
            if(!word.length) continue;

            tokens.push(this.createIdentifier(word, this.getPosEnum(start, stream.eof() && !endedWithNewLine), isPunctuation, this.getSpaceEnum(space, endedWithSpace)));
            if(start && !(stream.eof() && !endedWithNewLine)) start = false;
            space = endedWithSpace;

            if(endedWithNewLine) tokens.push(this.createIdentifier('\n', stream.eof() ? Markov.id.pos.end : Markov.id.pos.middle, true, Markov.id.space.none));
        }

        return tokens;
    }

    feed(str, order = 1) {
        if(order < 1) throw new RangeError('Chain-Order must be 1 or larger');
        const tokens = this.tokenize(str);

        for(const token of tokens) if(!this.nodes.has(token)) this.append(token);
        for(let i = 0; i < tokens.length - 1; ++i) {
            this.matrix[this.nodes.get(tokens[i]) * this.matrix.size1d + this.nodes.get(tokens[i + 1])] += 1;
        }
    }

    unfeed(str) {
        const tokens = this.tokenize(str);
        const markedForRemoval = [];

        for(let i = 0; i < tokens.length; ++i) {
            if(this.nodes.has(tokens[i])) {
                let hasOutgoing = false;
                let hasIncoming = false;
                if(i < tokens.length - 1 && this.nodes.has(tokens[i + 1])) {
                    const ind = this.nodes.get(tokens[i]) * this.matrix.size1d;
                    if(this.matrix[ind + this.nodes.get(tokens[i + 1])] > 0) this.matrix[ind + this.nodes.get(tokens[i + 1])] -= 1;
                    for(let x = 0; x < this.stored; ++x) {
                        if(this.matrix[ind + x]) {
                            hasOutgoing = true;
                            break;
                        }
                    }
                }

                if(i) {
                    const ind = this.nodes.get(tokens[i]);
                    for(let y = 0, i = 0; i < this.stored; y += this.matrix.size1d, ++i) {
                        if(this.matrix[ind + y]) {
                            hasIncoming = true;
                            break;
                        }
                    }
                }

                if(!hasOutgoing && !hasIncoming) markedForRemoval.push(tokens[i]);
            }
        }
        if(markedForRemoval.length) {
            const oldMatrix = this.matrix.serialize();
            for(const token of markedForRemoval) {
                const index = this.indexToIdentifier.indexOf(token);
                if(index == -1) {
                    console.warn('Tried to unfeed invalid token!: "' + token + '"');
                    continue;
                }
                this.indexToIdentifier.splice(index, 1);

                let mI = oldMatrix.data.length;
                while(mI --> 0) {
                    const [key, value] = oldMatrix.data[mI];
                    const x = key % oldMatrix.size1d;
                    const y = Math.trunc(key / oldMatrix.size1d);

                    let newX = x;
                    let newY = y;
                    
                    if(x >= index) newX -= 1;
                    if(y >= index) newY -= 1;

                    if(x != newX || y != newY) {
                        if(x != index && y != index) {
                            oldMatrix.data[mI] = [newY * oldMatrix.size1d + newX, value];
                        } else oldMatrix.data[mI][1] = -1;
                    }
                }
            }
            let mI = oldMatrix.data.length;
            while(mI --> 0) {
                const [key, value] = oldMatrix.data[mI];
                const x = key % oldMatrix.size1d;
                const y = Math.trunc(key / oldMatrix.size1d);
                oldMatrix.data[mI] = [y * (oldMatrix.size1d - markedForRemoval.length) + x, value];
            }
            oldMatrix.data = oldMatrix.data.filter(([key, value]) => value >= 0);
            oldMatrix.size1d -= markedForRemoval.length;
            this.matrix = new SparseMatrix(oldMatrix);
            this.nodes = new Map();
            for(this.stored = 0; this.stored < this.indexToIdentifier.length; ++this.stored) {
                this.nodes.set(this.indexToIdentifier[this.stored], this.stored);
            }
        }
    }

    generateBackwards(identifier) {
        const out = [identifier];

        const weights = new Uint32Array(this.stored);
        while((identifier.charCodeAt(0) & Markov.id.pos.mask) != Markov.id.pos.start) {
            const col = this.nodes.get(identifier);

            let val = 0;
            let encounteredNonZero = false;
            for(let y = 0, i = 0; i < this.stored; y += this.matrix.size1d, ++i) {
                weights[i] = this.matrix[col + y];
                if(i && weights[i]) {
                    weights[i] += val;
                    val = weights[i]
                } else if(!i && weights[i]) val = weights[i];
                if(weights[i]) encounteredNonZero = true;
            }
            if(!encounteredNonZero) {
                console.warn('Non-start Token went out of bounds!: ', this.debugTokens([identifier]));
                break;
            }

            const rand = Math.random() * val;
            let ind = 0;
            while(weights[ind] < rand) ind += 1;
            identifier = this.indexToIdentifier[ind];
            out.push(identifier);
        }

        return out.reverse();
    }

    generateForwards(identifier) {
        const out = [identifier];

        const weights = new Uint32Array(this.stored);
        while((identifier.charCodeAt(0) & Markov.id.pos.mask) != Markov.id.pos.end) {
            const row = this.nodes.get(identifier) * this.matrix.size1d;

            let val = 0;
            let encounteredNonZero = false;
            for(let x = 0; x < this.stored; ++x) {
                weights[x] = this.matrix[row + x];
                if(x && weights[x]) {
                    weights[x] += val;
                    val = weights[x];
                } else if(!x && weights[x]) val = weights[x];
                if(weights[x]) encounteredNonZero = true;
            }

            if(!encounteredNonZero) {
                console.warn('Non-end Token went out of bounds!: ', this.debugTokens([identifier]));
                break;
            }

            const rand = Math.random() * val;
            let ind = 0;
            while(weights[ind] < rand) ind += 1;
            identifier = this.indexToIdentifier[ind];
            out.push(identifier);
        }

        return out;
    }

    generate(identifier) {
        if(!this.nodes.has(identifier)) throw new Error('Unknown Identifier');
        const tokens = [];
        switch(identifier.charCodeAt(0) & Markov.id.pos.mask) {
            case Markov.id.pos.start : tokens.push(...this.generateForwards(identifier)); break;
            case Markov.id.pos.middle : tokens.push(...this.generateBackwards(identifier), ...(this.generateForwards(identifier).splice(1))); break;
            case Markov.id.pos.end : tokens.push(...this.generateBackwards(identifier)); break;
            case Markov.id.pos.all : tokens.push(identifier);
        }

        return tokens;
    }

    combineTokens(tokens) {
        if(!tokens.length) return this.emptyToken;
        let str = '';
        let startIsStart = false;
        let endIsEnd = false;
        let exclusivelyPunc = true;
        let startsWithSpace = false;
        let endsWithSpace = false;

        for(let i = 0; i < tokens.length; ++i) {
            const code = tokens[i].charCodeAt(0);
            const pos = code & Markov.id.pos.mask;
            const space = code & Markov.id.space.mask;
            const isPunc = code & (1 << Markov.id.puncMaskBitIndex);
            
            if(!isPunc) exclusivelyPunc = false;

            if(pos == Markov.id.pos.all) {
                startIsStart = true;
                endIsEnd = true;
            } else if(!i && pos == Markov.id.pos.start) {
                startIsStart = true;
            } else if(i == tokens.length - 1 && pos == Markov.id.pos.end) {
                endIsEnd = true;
            }

            if(!i) {
                if(space == Markov.id.space.all || space == Markov.id.space.before) startsWithSpace = true;
            } else if(i == tokens.length - 1) {
                if(space == Markov.id.space.all || space == Markov.id.space.after) endsWithSpace = true;
            }

            if(space == Markov.id.space.all || space == Markov.id.space.before) {
                if(!Markov.whitespace.test(str.charAt(str.length - 1))) str += ' ';
            }
            str += tokens[i].substring(1);
            if(space == Markov.id.space.all || space == Markov.id.space.after) str += ' ';
        }
                
        return this.createIdentifier(str.trim(), this.getPosEnum(startIsStart, endIsEnd), exclusivelyPunc, this.getSpaceEnum(startsWithSpace, endsWithSpace));
    }

    debugTokens(tokens) {
        return tokens.map(s => {
            const code = s.charCodeAt(0);
            const space = code & Markov.id.space.mask;
            return {
                str: s.substring(1),
                pos: ['start', 'middle', 'end', 'single'][code & Markov.id.pos.mask],
                isPunc: Boolean(code & (1 << Markov.id.puncMaskBitIndex)),
                space: space == Markov.id.space.all
                    ? 'all'
                    : space == Markov.id.space.after
                        ? 'after'
                        : space == Markov.id.space.before
                            ? 'before'
                            : space == Markov.id.space.none
                                ? 'none'
                                : 'invalid'
            }
        })
    }

    find(query) {
        return this.indexToIdentifier.filter(s => s.substring(1).toLowerCase() == query) || [];
    }

    export() {
        const matrix = this.matrix.serialize();
        matrix.size1d = this.stored;
        matrix.size = this.stored * this.stored;
        return {
            tokens: Array.from(this.nodes).map(([key]) => key),
            matrix
        }
    }

    import(data) {
        this.indexToIdentifier = [];
        this.nodes = new Map();
        for(this.stored = 0; this.stored < data.tokens.length; ++this.stored) {
            this.indexToIdentifier.push(data.tokens[this.stored]);
            this.nodes.set(data.tokens[this.stored], this.stored);
        }
        data.matrix.size1d = this.stored;
        data.matrix.size = this.stored * this.stored;
        this.matrix = new SparseMatrix(data.matrix);
    }
}

export default Markov;