function initVal() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.textContent = `
            (() => {
                try {
                    let tValue = typeof t !== 'undefined' ? t : null;
                    if (tValue !== null) {
                        window.postMessage({
                            type: 'FROM_PAGE',
                            paraules: tValue.p,
                            lletres: tValue.l,
                            today: tValue
                        }, '*');
                    } else {
                        window.postMessage({ type: 'FROM_PAGE', error: 't not found' }, '*');
                    }
                } catch (error) {
                    window.postMessage({ type: 'FROM_PAGE', error: error.message }, '*');
                }
            })();
        `;
        document.documentElement.appendChild(script);

        window.addEventListener('message', handleWindowMessage(resolve, reject));
        setTimeout(() => reject(new Error('Timeout: t or required values not found')), 5000);
    });
}

function handleWindowMessage(resolve, reject) {
    return function (event) {
        if (event.source === window && event.data.type === 'FROM_PAGE') {
            if (event.data.paraules && event.data.lletres) {
                resolve({
                    paraules: event.data.paraules,
                    lletres: event.data.lletres,
                    today: event.data.today
                });
            } else {
                reject(new Error(event.data.error || 'Unknown error'));
            }
        }
    };
}

function removeNewWords(paraules) {
    const today = new Date();
    const key = `words_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const discoveredWords = JSON.parse(localStorage.getItem(key));

    if (discoveredWords) {
        return paraules.filter(word => !discoveredWords.includes(word));
    }
    return paraules;
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

    groupByPreSuf.cache = {};

    const cacheKey = `${num}-${isPrefix}`;
    if (groupByPreSuf.cache[cacheKey]) {
        return groupByPreSuf.cache[cacheKey];
    }

    const counts = {};

    paraules.forEach(word => {
        const key = isPrefix ? word.substring(0, num) : word.substring(word.length - num);
        counts[key] = (counts[key] || 0) + 1;
    });
    let result;
    if (num === 3) {
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        result = sorted.length > 0 ? `${sorted[0][0]}-${sorted[0][1]}` : '';
    } else {
        result = Object.entries(counts).map(([key, count]) => `${key}-${count}`).join(' ');
    }

    groupByPreSuf.cache[cacheKey] = result;
    return result;
}

function findTutis() {
    if (!findTutis.cache) {
        findTutis.cache = [];
    }
    if (findTutis.cache.length > 0) {
        findTutis.cache = findTutis.cache.filter(word => paraules.includes(word));
    } else {
        const requiredLetters = new Set(lletres);
        paraules.forEach(word => {
            if ([...requiredLetters].every(letter => word.includes(letter))) {
                findTutis.cache.push(word);
            }
        });
    }

    const tutisObj = {};
    findTutis.cache.forEach(word => {
        const length = word.length;
        tutisObj[length] = (tutisObj[length] || 0) + 1;
    });

    const result = Object.keys(tutisObj)
        .sort((a, b) => a - b)
        .map(length => `- ${tutisObj[length]} de ${length} lletres`);

    return {
        html: result,
        numElem: findTutis.cache.length
    };
}

function findPalindroms() {
    if (!findPalindroms.cache) {
        findPalindroms.cache = [];
    }
    if (findPalindroms.cache.length > 0) {
        findPalindroms.cache = findPalindroms.cache.filter(word => paraules.includes(word));
    } else {
        paraules.forEach(word => {
            const reversedWord = word.split('').reverse().join('');
            if (word === reversedWord) {
                findPalindroms.cache.push(word);
            }
        });
    }

    const palindromsObj = {};
    findPalindroms.cache.forEach(word => {
        const length = word.length;
        palindromsObj[length] = (palindromsObj[length] || 0) + 1;
    });

    const result = Object.keys(palindromsObj)
        .sort((a, b) => a - b)
        .map(length => `- ${palindromsObj[length]} de ${length} lletres`);

    return {
        html: result,
        numElem: findPalindroms.cache.length
    };
}

function findQuadrats() {
    if (!findQuadrats.cache) {
        findQuadrats.cache = [];
    }
    if (findQuadrats.cache.length > 0) {
        findQuadrats.cache = findQuadrats.cache.filter(word => paraules.includes(word));
    } else {
        paraules.forEach(word => {
            const length = word.length;
            if (length % 2 === 0) {
                const mid = length / 2;
                const firstHalf = word.slice(0, mid);
                const secondHalf = word.slice(mid);
                if (firstHalf === secondHalf) {
                    findQuadrats.cache.push(word);
                }
            }
        });
    }

    const quadObj = {};
    findQuadrats.cache.forEach(word => {
        const length = word.length;
        quadObj[length] = (quadObj[length] || 0) + 1;
    });

    const result = Object.keys(quadObj)
        .sort((a, b) => a - b)
        .map(length => `- ${quadObj[length]} de ${length} lletres`);

    return {
        html: result,
        numElem: findQuadrats.cache.length
    };
}

function findSubconjunts() {

    findSubconjunts.cache = {};
    paraules.forEach(word => {
        const uniqueLetters = Array.from(new Set(word)).sort().join('');
        findSubconjunts.cache[uniqueLetters] = (findSubconjunts.cache[uniqueLetters] || 0) + 1;
    });

    return Object.entries(findSubconjunts.cache)
        .map(([letters, count]) => `${letters}-${count}`)
        .join(' ');
}

function updatePistes() {
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
        const tbody = table.querySelector("tbody");

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
        console.error("Table not found");
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
    updateElement(document.getElementById('sufix3'), groupByPreSuf(3, false), 'Prefix freqüent de tres lletres:');
}

function updateTutis() {
    const el = document.getElementById('tutis');
    if (el) {
        const { numElem, html } = findTutis();
        el.textContent = '';
        el.appendChild(document.createElement('strong')).textContent = numElem > 0 ? `Queden ${numElem} tutis:` : `Has trobat tots els tutis!`;
        if (numElem > 0) html.forEach(item => el.appendChild(document.createElement('br')) && el.appendChild(document.createTextNode(item)));
    }
}

function updatePalindroms() {
    const el = document.getElementById('palindroms');
    if (el) {
        const { numElem, html } = findPalindroms();
        el.textContent = '';
        el.appendChild(document.createElement('strong')).textContent = numElem > 0 ? `Queden ${numElem} palíndroms:` : `Has trobat tots els palíndroms!`;
        if (numElem > 0) html.forEach(item => el.appendChild(document.createElement('br')) && el.appendChild(document.createTextNode(item)));
    }
}

function updateQuadrats() {
    const el = document.getElementById('quadrats');
    if (el) {
        const { numElem, html } = findQuadrats();
        el.textContent = '';
        el.appendChild(document.createElement('strong')).textContent = numElem > 0 ? `Queden ${numElem} mots quadrats:` : `Has trobat tots els mots quadrats!`;
        if (numElem > 0) html.forEach(item => el.appendChild(document.createElement('br')) && el.appendChild(document.createTextNode(item)));
    }
}

function updateSubconjunts() {
    const subcElement = document.getElementById('subconjunts');
    if (subcElement) {
        subcElement.textContent = '';  // Clear content
        subcElement.appendChild(Object.assign(document.createElement('b'), { className: 'pistes', textContent: 'Subconjunts:' }));
        subcElement.appendChild(document.createElement('br'));
        subcElement.appendChild(document.createTextNode(findSubconjunts()));
    }
}

let lletres, paraules, charMatrix;

const observerSubmitButton = new MutationObserver(() => {
    const submitButton = document.getElementById("submit-button");

    if (submitButton) {

        (async function submitButtonCheck() {
            try {
                const result = await initVal();
                paraules = Object.keys(result.paraules);
                console.log(paraules);
                lletres = result.lletres.filter(letter => letter !== " ").sort();

                let maxLen = 0;
                for (const word of paraules) {
                    if (word.length > maxLen) {
                        maxLen = word.length;
                    }
                }

                removeNewWords(paraules);
                charMatrix = initMatrix(lletres.map(letter => letter.toUpperCase()), maxLen);

                const submitFunction = () => {
                    updateMatrix(charMatrix);
                };

                submitButton.addEventListener("click", submitFunction);

                document.addEventListener("keydown", function(event) {
                    if (event.key === 'Enter') {
                        submitFunction();
                    }
                });

            } catch (error) {
                console.error("Error:", error.message);
            }
        })();

        observerSubmitButton.disconnect();
    }
});

observerSubmitButton.observe(document.body, { childList: true, subtree: true });

const observerPistes = new MutationObserver(() => {
    const pistesButton = document.getElementById("pistes-link");

    if (pistesButton) {

        pistesButton.addEventListener("click", async function () {
            updatePistes();
        });

        observerPistes.disconnect();
    }
});

observerPistes.observe(document.body, { childList: true, subtree: true });
