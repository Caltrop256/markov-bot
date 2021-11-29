class Node {
    static position = {
        start: 0,
        middle: 1,
        end: 2
    }

    prev = new Map();
    next = new Map();

    constructor(txt, pos, punc) {
        this.txt = txt;
        this.pos = pos;
        this.punc = punc;
    }

    toString() {
        return this.txt + '_' + this.pos;
    }

    weightedRandom(values) {
        if(!values.length) return null;
        const weights = new Array(values.length);
        for(let i = 0; i < weights.length; ++i) {
            weights[i] = values[i][1].count;
            if(i) weights[i] += weights[i - 1];
        }
        const rand = Math.random() * weights[weights.length - 1];
        let ind = 0;
        while(weights[ind++] < rand);
        return values[ind - 1][1].ref;
    }

    getNext() {
        return this.weightedRandom(Array.from(this.next));
    }

    getPrev() {
        return this.weightedRandom(Array.from(this.prev));
    }
}

class Chain {
    static punctuation = /[!-/:-@[-`{-~¡-©«-¬®-±´¶-¸»¿×÷˂-˅˒-˟˥-˫˭˯-˿͵;΄-΅·϶҂՚-՟։-֊־׀׃׆׳-״؆-؏؛؞-؟٪-٭۔۩۽-۾܀-܍߶-߹।-॥॰৲-৳৺૱୰௳-௺౿ೱ-ೲ൹෴฿๏๚-๛༁-༗༚-༟༴༶༸༺-༽྅྾-࿅࿇-࿌࿎-࿔၊-၏႞-႟჻፠-፨᎐-᎙᙭-᙮᚛-᚜᛫-᛭᜵-᜶។-៖៘-៛᠀-᠊᥀᥄-᥅᧞-᧿᨞-᨟᭚-᭪᭴-᭼᰻-᰿᱾-᱿᾽᾿-῁῍-῏῝-῟῭-`´-῾\u2000-\u206e⁺-⁾₊-₎₠-₵℀-℁℃-℆℈-℉℔№-℘℞-℣℥℧℩℮℺-℻⅀-⅄⅊-⅍⅏←-⏧␀-␦⑀-⑊⒜-ⓩ─-⚝⚠-⚼⛀-⛃✁-✄✆-✉✌-✧✩-❋❍❏-❒❖❘-❞❡-❵➔➘-➯➱-➾⟀-⟊⟌⟐-⭌⭐-⭔⳥-⳪⳹-⳼⳾-⳿⸀-\u2e7e⺀-⺙⺛-⻳⼀-⿕⿰-⿻\u3000-〿゛-゜゠・㆐-㆑㆖-㆟㇀-㇣㈀-㈞㈪-㉃㉐㉠-㉿㊊-㊰㋀-㋾㌀-㏿䷀-䷿꒐-꓆꘍-꘏꙳꙾꜀-꜖꜠-꜡꞉-꞊꠨-꠫꡴-꡷꣎-꣏꤮-꤯꥟꩜-꩟﬩﴾-﴿﷼-﷽︐-︙︰-﹒﹔-﹦﹨-﹫！-／：-＠［-｀｛-･￠-￦￨-￮￼-�]|\ud800[\udd00-\udd02\udd37-\udd3f\udd79-\udd89\udd90-\udd9b\uddd0-\uddfc\udf9f\udfd0]|\ud802[\udd1f\udd3f\ude50-\ude58]|\ud809[\udc00-\udc7e]|\ud834[\udc00-\udcf5\udd00-\udd26\udd29-\udd64\udd6a-\udd6c\udd83-\udd84\udd8c-\udda9\uddae-\udddd\ude00-\ude41\ude45\udf00-\udf56]|\ud835[\udec1\udedb\udefb\udf15\udf35\udf4f\udf6f\udf89\udfa9\udfc3]|\ud83c[\udc00-\udc2b\udc30-\udc93]/;
    static punctuationSpaceBefore = /[\(\[\{*#]/;
    static punctuationSpaceAfter = /[\)\]\}.,:;!?>]+/;
    static escapeConnector = '\u200d';
    static escape(str) {
        let out = '';
        for(let i = 0; i < str.length; ++i) {
            out += str.charAt(i);
            if(i < str.length - 1 && Chain.punctuation.test(str.charAt(i)) != Chain.punctuation.test(str.charAt(i + 1))) {
                out += Chain.escapeConnector;
            }
        }
        return out;
    }

    static Node = Node;

    nodes = [new Map(), new Map(), new Map()];

    __nodesTravelled = 0; // im sorry

    generateForwards(source, quoteState = 0) {
        const node = source.getNext();
        if(node == null) return '';
        this.__nodesTravelled += 1;
        let txt = '';
        if(!node.punc && !source.punc) txt += ' ';
        else if(node.punc && source.punc);
        else if(node.punc && !source.punc) {
            if(Chain.punctuationSpaceBefore.test(node.txt)) txt += ' ';
            else if(quoteState == 0 && node.txt == '"') {
                quoteState += 1;
                txt += ' ';
            }
        }
        else if(!node.punc && source.punc) {
            if(Chain.punctuationSpaceAfter.test(source.txt)) txt += ' ';
            else if(quoteState != 1 && source.txt == '"') {
                if(quoteState == 1) quoteState = 2;
                else {
                    txt += ' ';
                    quoteState = 0;
                }
            }
        }

        txt += node.txt;
        return txt + (node.pos == Chain.Node.position.end ? '' : this.generateForwards(node, quoteState));
    }

    generateBackwards(source, quoteState = 0) {
        const node = source.getPrev();
        if(node == null) return '';
        this.__nodesTravelled += 1;
        let txt = '';
        if(!node.punc && !source.punc) txt += ' ';
        else if(node.punc && source.punc);
        else if(!node.punc && source.punc) {
            if(Chain.punctuationSpaceBefore.test(source.txt)) txt += ' ';
            else if(quoteState != 0 && source.txt == '"') {
                if(quoteState == 1) quoteState = 2;
                else {
                    txt += ' ';
                    quoteState = 0;
                }
            }
        }
        else if(node.punc && !source.punc) {
            if(Chain.punctuationSpaceAfter.test(node.txt)) txt += ' ';
            else if(quoteState == 0 && node.txt == '"') {
                txt += ' ';
                quoteState = 1;
            }
        }
        return (node.pos == Chain.Node.position.start ? '' : this.generateBackwards(node, quoteState)) + node.txt + txt;
    }

    generate(node) {
        this.__nodesTravelled = 1;
        switch(node.pos) {
            case Chain.Node.position.start : return node.txt + this.generateForwards(node);
            case Chain.Node.position.middle : return this.generateBackwards(node) + node.txt + this.generateForwards(node); // might break quotes
            case Chain.Node.position.end : return this.generateBackwards(node) + node.txt;
        }
    }

    tokenize(data) {
        if(!data) return [];
        const sentence = [];
        let pseudoWord = '';
        let matchingStatus = 0;
        let beginning = true;

        const resetMatchingStatus = isEnd => {
            sentence.push({
                text: pseudoWord,
                punc: matchingStatus == 2,
                position: beginning
                    ? Chain.Node.position.start
                    : isEnd
                        ? Chain.Node.position.end
                        : Chain.Node.position.middle
            });
            if(matchingStatus != 2 && beginning) beginning = false;
            if(isEnd) beginning = true;
            matchingStatus = 0;
            pseudoWord = '';
        }

        for(let i = 0; i < data.length; ++i) {
            const char = data.charAt(i);
            if(char.match(/\s/)) {
                if(matchingStatus != 0) resetMatchingStatus(/\n/.test(char));
                continue;
            };

            if(char == Chain.escapeConnector) {
                matchingStatus = Chain.punctuation.test(data.charAt(i + 1)) ? 2 : 1;
                continue;
            }

            const charIsPunc = Chain.punctuation.test(char) && char != "'";
            if(char != Chain.escapeConnector && ((charIsPunc && matchingStatus == 1) || (!charIsPunc && matchingStatus == 2))) resetMatchingStatus(false);
            matchingStatus = charIsPunc ? 2 : 1;
            pseudoWord += char;
        }
        resetMatchingStatus(!beginning);
        return sentence;
    }

    feed(str) {
        if(!str) return;
        const sentence = this.tokenize(str);

        for(let i = 0; i < sentence.length; ++i) {
            const {position, text, punc} = sentence[i];
            if(!this.nodes[position].has(text)) this.nodes[position].set(text, new Node(text, position, punc));
        }

        for(let i = 0; i < sentence.length; ++i) {
            const {position, text} = sentence[i];
            const selfNode = this.nodes[position].get(text);
            if(position != Chain.Node.position.end && i != sentence.length - 1) {
                const succeedingNode = this.nodes[sentence[i + 1].position].get(sentence[i + 1].text);
                const countRef = selfNode.next.get(succeedingNode.toString()) || {count: 0, ref: succeedingNode};
                countRef.count += 1;
                selfNode.next.set(succeedingNode.toString(), countRef);
            }

            if(position != Chain.Node.position.start) {
                const preceedingNode = this.nodes[sentence[i - 1].position].get(sentence[i - 1].text);
                const countRef = selfNode.prev.get(preceedingNode.toString()) || {count: 0, ref: preceedingNode};
                countRef.count += 1;
                selfNode.prev.set(preceedingNode.toString(), countRef);
            }
        }
    }

    unfeed(str) {
        if(!str) return;
        const sentence = this.tokenize(str);
        
        for(let i = 0; i < sentence.length; ++i) {
            const {position, text} = sentence[i];
            if(!this.nodes[position].has(text)) continue;
            const node = this.nodes[position].get(text);

            if(position != Chain.Node.position.end && i != sentence.length - 1) {
                const succeedingNode = this.nodes[sentence[i + 1].position].get(sentence[i + 1].text);
                const succId = succeedingNode.toString();
                const countRef = node.next.get(succId);
                countRef.count -= 1;
                if(countRef.count <= 0) node.next.delete(succId);
            }

            if(position != Chain.Node.position.start) {
                const preceedingNode = this.nodes[sentence[i - 1].position].get(sentence[i - 1].text);
                const precId = preceedingNode.toString();
                const countRef = node.prev.get(precId);
                countRef.count -= 1;
                if(countRef.count <= 0) node.prev.delete(precId);
            }
        }

        for(let i = 0; i < sentence.length; ++i) {
            const {position, text} = sentence[i];
            if(!this.nodes[position].has(text)) continue;
            const node = this.nodes[position].get(text);
            if(!node.prev.size && !node.next.size) this.nodes[position].delete(text);
        }
    }

    export() {
        const data = {
            start: [],
            middle: [],
            end: []
        }
        for(let i = 0; i < this.nodes.length; ++i) {
            const arr = data[Object.keys(Chain.Node.position)[i]];
            const items = Array.from(this.nodes[i]);
            for(let j = 0; j < items.length; ++j) {
                const nodeData = {
                    txt: items[j][1].txt,
                    prev: {},
                    next: {}
                }
                const prevItems = Array.from(items[j][1].prev);
                for(let k = 0; k < prevItems.length; ++k) {
                    nodeData.prev[prevItems[k][0]] = prevItems[k][1].count;
                }
                const nextItems = Array.from(items[j][1].next);
                for(let k = 0; k < nextItems.length; ++k) {
                    nodeData.next[nextItems[k][0]] = nextItems[k][1].count;
                }
                arr.push(nodeData);
            }
        }

        return data;
    }

    import(json) {
        for(const pos in json) {
            const map = this.nodes[Chain.Node.position[pos]];
            for(let i = 0; i < json[pos].length; ++i) {
                const item = json[pos][i];
                map.set(item.txt, new Node(item.txt, Chain.Node.position[pos], item.txt.split('').every(char => Chain.punctuation.test(char))));
                for(const token in item.prev) {
                    map.get(item.txt).prev.set(token, {
                        count: item.prev[token],
                        ref: null
                    })
                }
                for(const token in item.next) {
                    map.get(item.txt).next.set(token, {
                        count: item.next[token],
                        ref: null
                    })
                }
            }
        }

        for(let i = 0; i < this.nodes.length; ++i) {
            const arr = Array.from(this.nodes[i]);
            for(let j = 0; j < arr.length; ++j) {
                const prevVals = Array.from(arr[j][1].prev);
                for(let k = 0; k < prevVals.length; ++k) {
                    const text = prevVals[k][0].substring(0, prevVals[k][0].lastIndexOf('_'));
                    const pos = prevVals[k][0].substring(prevVals[k][0].lastIndexOf('_') + 1, prevVals[k][0].length);
                    prevVals[k][1].ref = this.nodes[pos].get(text);
                }
                const nextVals = Array.from(arr[j][1].next);
                for(let k = 0; k < nextVals.length; ++k) {
                    const text = nextVals[k][0].substring(0, nextVals[k][0].lastIndexOf('_'));
                    const pos = nextVals[k][0].substring(nextVals[k][0].lastIndexOf('_') + 1, nextVals[k][0].length);
                    nextVals[k][1].ref = this.nodes[pos].get(text);
                }
            }
        }
    }
}

module.exports = Chain;