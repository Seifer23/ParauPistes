function initVal() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.textContent = `
            (() => {
                const start = Date.now();
                const poll = () => {
                    try {
                        if (typeof t !== 'undefined' && t && t.p && t.l) {
                            window.postMessage({ type: 'FROM_PAGE', paraules: t.p, lletres: t.l }, '*');
                        } else if (Date.now() - start < 10000) {
                            setTimeout(poll, 100);
                        } else {
                            window.postMessage({ type: 'FROM_PAGE', error: 't not found' }, '*');
                        }
                    } catch (error) {
                        window.postMessage({ type: 'FROM_PAGE', error: error.message }, '*');
                    }
                };
                poll();
            })();
        `;

        const onMessage = (event) => {
            if (event.source !== window || event.data?.type !== 'FROM_PAGE') return;
            window.removeEventListener('message', onMessage);
            clearTimeout(timer);
            if (event.data.paraules && event.data.lletres) {
                resolve({ paraules: event.data.paraules, lletres: event.data.lletres });
            } else {
                reject(new Error(event.data.error || 'Unknown error'));
            }
        };
        const timer = setTimeout(() => {
            window.removeEventListener('message', onMessage);
            reject(new Error('Timeout: no response from page'));
        }, 12000);

        window.addEventListener('message', onMessage);   // listen before injecting
        document.documentElement.appendChild(script);
        script.remove();
    });
}

function removeNewWords(paraules) {
    const joc = document.body.dataset.joc;
    if (!joc) return paraules;
    const key = `words_${joc}`;
    let discoveredWords;
    try { discoveredWords = JSON.parse(localStorage.getItem(key)); } catch { discoveredWords = null; }

    if (!Array.isArray(discoveredWords)) return paraules;

    const found = new Set(discoveredWords);
    return paraules.filter(word => !found.has(word));
}

function initMatrix(lletres, maxLen) {
    const rows = lletres.length + 2;
    const columns = maxLen;
    const charMatrix = Array.from({ length: rows }, () => Array(columns).fill(0));

    for (let i = 1; i < rows - 1; i++) {
        charMatrix[i][0] = lletres[i - 1];
    }
    for (let j = 1; j < columns; j++) {
        charMatrix[0][j] = j + 2;
    }
    charMatrix[0][0] = "✨";
    charMatrix[0][columns - 1] = "Σ";
    charMatrix[rows - 1][0] = "Σ";

    updateMatrix(charMatrix);
    return charMatrix;
}

function updateMatrix(charMatrix) {
    paraules = removeNewWords(paraules);
    resetMatrix(charMatrix);

    charMatrix.forEach((row, i) => {
        if (i > 0 && i < charMatrix.length - 1) {
            const initialWords = paraules.filter(word => word.startsWith(lletres[i - 1]));
            initialWords.forEach(word => {
                const lenIndex = word.length - 2;
                if (lenIndex < charMatrix[i].length - 1) {
                    charMatrix[i][lenIndex]++;
                    charMatrix[charMatrix.length - 1][lenIndex]++;
                    charMatrix[charMatrix.length - 1][charMatrix[i].length - 1]++;
                }
            });
            charMatrix[i][charMatrix[i].length - 1] = initialWords.length;
        }
    });
}

function resetMatrix(charMatrix) {
    for (let i = 1; i < charMatrix.length; i++) {
        for (let j = 1; j < charMatrix[i].length; j++) {
            charMatrix[i][j] = 0;
        }
    }
}

function groupByPreSuf(num, isPrefix) {
    const counts = {};
    paraules.forEach(word => {
        const key = isPrefix ? word.slice(0, num) : word.slice(-num);
        counts[key] = (counts[key] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (num === 3) {
        if (entries.length === 0) return '';
        const max = Math.max(...entries.map(([, count]) => count));
        return entries
            .filter(([, count]) => count === max)
            .map(([key, count]) => `${key}-${count}`)
            .join(' ');
    }
    return entries.map(([key, count]) => `${key}-${count}`).join(' ');
}

function countByLength(pred) {
    const words = paraules.filter(pred);
    const byLen = {};
    words.forEach(w => byLen[w.length] = (byLen[w.length] || 0) + 1);
    return {
        numElem: words.length,
        html: Object.keys(byLen)
            .sort((a, b) => a - b)
            .map(len => `- ${byLen[len]} de ${len} lletres`)
    };
}

const isTuti = w => lletres.every(l => w.includes(l));
const isPalindrom = w => w === [...w].reverse().join('');
const isQuadrat = w => w.length % 2 === 0 && w.slice(0, w.length / 2) === w.slice(w.length / 2);

function findSubconjunts() {
    const counts = {};
    paraules.forEach(word => {
        const letters = [...new Set(word)].sort((a, b) => a.localeCompare(b, 'ca')).join('');
        counts[letters] = (counts[letters] || 0) + 1;
    });
    return Object.entries(counts).map(([letters, count]) => `${letters}-${count}`).join(' ');
}

function updatePistes() {

    if(!charMatrix) return;

    updateTable();
    updatePrefixSuffix();
    updateTutis();
    updatePalindroms();
    updateQuadrats();
    updateSubconjunts();
}

function updateTable() {
    const table = document.getElementById("table_graella");
    if (table) {
        
        const tbody = table.tBodies[0] || table.createTBody();  
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }

        charMatrix.forEach((rowData, rowIndex) => {
            const row = document.createElement("tr");
            rowData.forEach((cellData, cellIndex) => {
                const cell = document.createElement("td");
                cell.textContent = cellData;
                cell.setAttribute("align", "left");
                if (rowIndex === 0 || cellIndex === 0) {
                    cell.style.fontWeight = "bold";
                }
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });
    } else {
        console.error("ParauPistes: #table_graella not found");
    }
}

function updatePrefixSuffix() {
    const updateElement = (el, data, label) => {
        if (el) {
            el.textContent = '';
            if (data.length !== 0) {
                el.appendChild(document.createElement('b')).className = 'pistes';
                el.lastChild.textContent = label;
                el.appendChild(document.createTextNode(data));
            }
        }
    };

    updateElement(document.getElementById('prefix2'), groupByPreSuf(2, true), 'Prefixos de dues lletres:');
    updateElement(document.getElementById('prefix3'), groupByPreSuf(3, true), 'Prefix freqüent de tres lletres:');
    updateElement(document.getElementById('sufix3'), groupByPreSuf(3, false), 'Sufixos freqüents de tres lletres:');
}

function renderCountList(id, result, remaining, allFound) {
    const el = document.getElementById(id);
    if (!el) return;
    const { numElem, html } = result;
    el.textContent = '';
    el.appendChild(document.createElement('strong')).textContent =
        numElem > 0 ? `Queden ${numElem} ${remaining}:` : `Has trobat tots els ${allFound}!`;
    if (numElem > 0) html.forEach(item => {
        el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(item));
    });
}

function updateTutis() { renderCountList('tutis', countByLength(isTuti), 'tutis', 'tutis'); }
function updatePalindroms() { renderCountList('palindroms', countByLength(isPalindrom), 'palíndroms', 'palíndroms'); }
function updateQuadrats() { renderCountList('quadrats', countByLength(isQuadrat), 'mots quadrats', 'mots quadrats'); }

function updateSubconjunts() {
    const subcElement = document.getElementById('subconjunts');
    if (subcElement) {
        subcElement.textContent = '';  // Clear content
        subcElement.appendChild(Object.assign(document.createElement('b'), { className: 'pistes', textContent: 'Subconjunts:' }));
        subcElement.appendChild(document.createTextNode(findSubconjunts()));
    }
}

let lletres, paraules, charMatrix;

function whenElement(id, cb) {
    const el = document.getElementById(id);
    if (el) return cb(el);
    const obs = new MutationObserver(() => {
        const el = document.getElementById(id);
        if (el) {
            obs.disconnect();
            cb(el);
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
}

whenElement("submit-button", () => {
    (async function submitButtonCheck() {
        try {
            const result = await initVal();
            paraules = Object.keys(result.paraules);
            //console.log(paraules);
            lletres = result.lletres
                .filter(letter => letter !== " ")
                .sort((a, b) => a.localeCompare(b, 'ca'));

            const maxLen = Math.max(...paraules.map(w => w.length));

            //removeNewWords(paraules);
            charMatrix = initMatrix(lletres.map(letter => letter.toUpperCase()), maxLen);

            const counter = document.getElementById('letters-found');
            if (counter) {
                new MutationObserver(() => {
                    updateMatrix(charMatrix);
                    if (document.getElementById('pistes')?.style.display === 'block') {
                        updatePistes(); 
                    }
                }).observe(counter, { childList: true, characterData: true, subtree: true });
            } else {
                console.error("ParauPistes: #letters-found not found");
            }

        } catch (error) {
            console.error("ParauPistes:", error.message);
        }
    })();
});

whenElement("pistes-link", (pistesButton) => {
    pistesButton.addEventListener("click", updatePistes);
});
