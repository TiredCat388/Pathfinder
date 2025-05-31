// Cell types
const CellType = {
    EMPTY: "empty",
    START: "start",
    END: "end",
    OBSTACLE: "obstacle",
    VISITED: "visited",
    PATH: "path",
    CURRENT: "current",
};

// Global state
let mode = 'draw'; // 'draw', 'erase', 'setStart', 'setEnd'
let gridSize = 10;
let grid = [];
let startPos = { row: 0, col: 0 };
let endPos = { row: 9, col: 9 };
let isRunning = false;
let isMouseDown = false;

// DOM elements
const gridElement = document.getElementById("grid");
document.getElementById("eraseBtn").addEventListener("click", () => {
    if (mode === "erase") {
        mode = "draw"; // toggle back to draw if already in erase mode
    } else {
        mode = "erase";
    }
    highlightMode();
});

document.getElementById("setStartBtn").addEventListener("click", () => {
    if (mode === "setStart") {
        mode = "draw";
    } else {
        mode = "setStart";
    }
    highlightMode();
});

document.getElementById("setEndBtn").addEventListener("click", () => {
    if (mode === "setEnd") {
        mode = "draw";
    } else {
        mode = "setEnd";
    }
    highlightMode();
});


document.getElementById("setStartBtn").addEventListener("click", () => {
    mode = "setStart";
    highlightMode();
});

document.getElementById("setEndBtn").addEventListener("click", () => {
    mode = "setEnd";
    highlightMode();
});
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const clearBtn = document.getElementById("clearBtn");
const gridSizeSlider = document.getElementById("gridSizeSlider");
const gridSizeLabel = document.getElementById("gridSizeLabel");
const status = document.getElementById("status");
const spinner = document.getElementById("spinner");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");

// Utility functions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const manhattanDistance = (pos1, pos2) => {
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
};

const getNeighbors = (row, col) => {
    const neighbors = [];
    const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];

    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (
            newRow >= 0 &&
            newRow < gridSize &&
            newCol >= 0 &&
            newCol < gridSize
        ) {
            neighbors.push({ row: newRow, col: newCol });
        }
    }

    return neighbors;
};

const getCellClassName = (cellType) => {
    const baseSize =
        gridSize <= 10 ? "w-10 h-10" : gridSize <= 15 ? "w-8 h-8" : "w-6 h-6";
    const baseClasses = `${baseSize} border border-gray-400 cursor-pointer cell flex items-center justify-center text-xs font-bold`;

    switch (cellType) {
        case CellType.START:
            return `${baseClasses} bg-start text-white`;
        case CellType.END:
            return `${baseClasses} bg-end text-white`;
        case CellType.OBSTACLE:
            return `${baseClasses} bg-dark-blue`;
        case CellType.VISITED:
            return `${baseClasses} bg-baby-blue`;
        case CellType.PATH:
            return `${baseClasses} bg-path`;
        case CellType.CURRENT:
            return `${baseClasses} bg-current animate-pulse-slow`;
        default:
            return `${baseClasses} bg-white hover:bg-gray-50`;
    }
};

const updateStatus = (message, color = "bg-gray-100 text-gray-700") => {
    status.textContent = message;
    status.className = `px-4 py-2 rounded-lg text-sm font-medium ${color}`;
};

// Grid management
const initializeGrid = () => {
    grid = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(CellType.EMPTY));

    startPos = { row: 0, col: 0 };
    endPos = { row: gridSize - 1, col: gridSize - 1 };

    grid[startPos.row][startPos.col] = CellType.START;
    grid[endPos.row][endPos.col] = CellType.END;
};

const renderGrid = () => {
    gridElement.style.gridTemplateColumns = `repeat(${gridSize}, minmax(0, 1fr))`;
    gridElement.innerHTML = "";

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement("div");
            cell.className = getCellClassName(grid[i][j]);
            cell.dataset.row = i;
            cell.dataset.col = j;

            cell.setAttribute("draggable", "false");

            if (grid[i][j] === CellType.START) {
                cell.innerHTML = `<span class="select-none">S</span>`;
            } else if (grid[i][j] === CellType.END) {
                cell.innerHTML = `<span class="select-none">E</span>`;
            }

            // Mouse events
            cell.addEventListener("mousedown", (e) => {
                isMouseDown = true; // track mouse down globally

                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);

                if (mode === "erase") {
                    if (grid[row][col] === CellType.OBSTACLE) {
                        updateCell(row, col, CellType.EMPTY);
                    }
                } else if (mode === "setStart") {
                    updateCell(startPos.row, startPos.col, CellType.EMPTY);
                    startPos = { row, col };
                    updateCell(row, col, CellType.START);
                    mode = 'draw';
                    highlightMode();
                } else if (mode === "setEnd") {
                    updateCell(endPos.row, endPos.col, CellType.EMPTY);
                    endPos = { row, col };
                    updateCell(row, col, CellType.END);
                    mode = 'draw';
                    highlightMode();
                } else {
                    if (grid[row][col] !== CellType.START && grid[row][col] !== CellType.END) {
                        updateCell(row, col, CellType.OBSTACLE);
                    }
                }
            });


            cell.addEventListener("mouseenter", (e) => {
                if (isMouseDown && !isRunning && (e.buttons === 1)) {
                    if (mode === "draw" || mode === "erase") {
                        toggleCell(i, j);
                    }
                }
            });

            cell.addEventListener("dragstart", (e) => {
                e.preventDefault();
            });

            gridElement.appendChild(cell);
        }
    }
};


const toggleCell = (row, col) => {
    if (
        isRunning ||
        (row === startPos.row && col === startPos.col) ||
        (row === endPos.row && col === endPos.col)
    ) {
        return;
    }

    const currentType = grid[row][col];

    if (
        currentType === CellType.EMPTY ||
        currentType === CellType.VISITED ||
        currentType === CellType.PATH
    ) {
        grid[row][col] = CellType.OBSTACLE;
    } else if (currentType === CellType.OBSTACLE) {
        grid[row][col] = CellType.EMPTY;
    }

    updateCell(row, col, grid[row][col]); // update only the toggled cell
};

const updateCell = (row, col, cellType) => {
    grid[row][col] = cellType;
    const cellElement = gridElement.children[row * gridSize + col];
    cellElement.className = getCellClassName(cellType);

    if (cellType === CellType.START) {
        cellElement.textContent = "S";
    } else if (cellType === CellType.END) {
        cellElement.textContent = "E";
    } else {
        cellElement.textContent = "";
    }
};

const saveGrid = () => {
    const obstacles = [];
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j] === CellType.OBSTACLE) {
                obstacles.push({ row: i, col: j });
            }
        }
    }

    const data = {
        startPos,
        endPos,
        obstacles,
        gridSize,
    };

    localStorage.setItem("savedGrid", JSON.stringify(data));
    updateStatus("Grid saved!", "bg-green-100 text-green-700");
};


const loadGrid = () => {
    const data = JSON.parse(localStorage.getItem("savedGrid"));
    if (!data) {
        updateStatus("No saved grid found", "bg-yellow-100 text-yellow-700");
        return;
    }

    gridSize = data.gridSize;
    initializeGrid(); // resets grid with start and end

    // Set start and end positions
    startPos = data.startPos;
    endPos = data.endPos;

    // Reset all cells to empty first, then place start and end
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = CellType.EMPTY;
        }
    }
    grid[startPos.row][startPos.col] = CellType.START;
    grid[endPos.row][endPos.col] = CellType.END;

    // Add obstacles
    for (const { row, col } of data.obstacles) {
        // Make sure obstacles don’t overwrite start or end
        if (
            !(row === startPos.row && col === startPos.col) &&
            !(row === endPos.row && col === endPos.col)
        ) {
            grid[row][col] = CellType.OBSTACLE;
        }
    }

    gridSizeSlider.value = gridSize;
    gridSizeLabel.textContent = `${gridSize}×${gridSize}`;
    renderGrid();
    updateStatus("Grid loaded!", "bg-blue-100 text-blue-700");
};


// A* Algorithm
const reconstructPath = async (previous) => {
    const path = [];
    let current = { row: endPos.row, col: endPos.col };

    while (current && previous[current.row][current.col] !== null) {
        current = previous[current.row][current.col];
        if (current) {
            path.unshift(current);
        }
    }

    // Animate path
    for (const { row, col } of path) {
        if (
            grid[row][col] !== CellType.START &&
            grid[row][col] !== CellType.END
        ) {
            updateCell(row, col, CellType.PATH);
            await sleep(100);
        }
    }
};

const aStar = async () => {
    const openSet = [];
    const closedSet = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(false));
    const gScore = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(Infinity));
    const previous = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(null));

    const startH = manhattanDistance(startPos, endPos);
    gScore[startPos.row][startPos.col] = 0;
    openSet.push({
        row: startPos.row,
        col: startPos.col,
        f: startH,
        g: 0,
        h: startH,
    });

    while (openSet.length > 0) {
        // Get node with lowest f score
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const { row, col } = current;

        if (closedSet[row][col]) continue;
        closedSet[row][col] = true;

        // Visual update
        if (
            grid[row][col] !== CellType.START &&
            grid[row][col] !== CellType.END
        ) {
            updateCell(row, col, CellType.CURRENT);
            await sleep(100);

            if (
                grid[row][col] !== CellType.START &&
                grid[row][col] !== CellType.END
            ) {
                updateCell(row, col, CellType.VISITED);
            }
        }

        // Check if we reached the end
        if (row === endPos.row && col === endPos.col) {
            await reconstructPath(previous);
            return true;
        }

        // Check neighbors
        const neighbors = getNeighbors(row, col);
        for (const neighbor of neighbors) {
            const { row: nRow, col: nCol } = neighbor;

            if (
                closedSet[nRow][nCol] ||
                grid[nRow][nCol] === CellType.OBSTACLE
            ) {
                continue;
            }

            const tentativeG = gScore[row][col] + 1;

            if (tentativeG < gScore[nRow][nCol]) {
                gScore[nRow][nCol] = tentativeG;
                previous[nRow][nCol] = { row, col };

                const h = manhattanDistance({ row: nRow, col: nCol }, endPos);
                const f = tentativeG + h;

                // Add to open set if not already there with better score
                const existingIndex = openSet.findIndex(
                    (node) => node.row === nRow && node.col === nCol
                );
                if (existingIndex === -1) {
                    openSet.push({ row: nRow, col: nCol, f, g: tentativeG, h });
                } else if (tentativeG < openSet[existingIndex].g) {
                    openSet[existingIndex] = {
                        row: nRow,
                        col: nCol,
                        f,
                        g: tentativeG,
                        h,
                    };
                }
            }
        }
    }

    return false; // No path found
};

// Event handlers
const startAlgorithm = async () => {
    if (isRunning) return;

    isRunning = true;
    updateStatus("Running A* algorithm...", "bg-blue-100 text-blue-700");
    spinner.classList.remove("hidden");
    startBtn.disabled = true;
    resetBtn.disabled = true;
    clearBtn.disabled = true;
    gridSizeSlider.disabled = true;

    try {
        const pathFound = await aStar();

        if (pathFound) {
            updateStatus("Optimal path found!", "bg-green-100 text-green-700");
        } else {
            updateStatus("No path exists", "bg-red-100 text-red-700");
        }
    } catch (error) {
        updateStatus("Error occurred", "bg-red-100 text-red-700");
        console.error("Algorithm error:", error);
    }

    isRunning = false;
    spinner.classList.add("hidden");
    startBtn.disabled = false;
    resetBtn.disabled = false;
    clearBtn.disabled = false;
    gridSizeSlider.disabled = false;
};

const resetGrid = () => {
    if (isRunning) return;

    initializeGrid();
    renderGrid();
    updateStatus("Ready to start A* Search");
};

const clearPath = () => {
    if (isRunning) return;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (
                grid[i][j] === CellType.VISITED ||
                grid[i][j] === CellType.PATH
            ) {
                updateCell(i, j, CellType.EMPTY);
            }
        }
    }
    updateStatus("Ready to start A* Search");
};

const resizeGrid = (newSize) => {
    if (isRunning) return;

    gridSize = parseInt(newSize);
    gridSizeLabel.textContent = `${gridSize}×${gridSize}`;
    initializeGrid();
    renderGrid();
    updateStatus("Ready to start A* Search");
};

// Event listeners
startBtn.addEventListener("click", startAlgorithm);
resetBtn.addEventListener("click", resetGrid);
clearBtn.addEventListener("click", clearPath);
saveBtn.addEventListener("click", saveGrid);
loadBtn.addEventListener("click", loadGrid);
gridSizeSlider.addEventListener("input", (e) =>
    resizeGrid(e.target.value)
);

// Global mouse events
document.addEventListener("mousedown", (e) => {
    if (e.button === 0) { // left click only
        isMouseDown = true;
    }
});

document.addEventListener("mouseup", (e) => {
    isMouseDown = false;
});


document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// Initialize
initializeGrid();
renderGrid();

const highlightMode = () => {
    const modes = ["erase", "setStart", "setEnd"];
    modes.forEach((m) => {
        const btn = document.getElementById(`${m}Btn`);
        if (mode === m) {
            btn.classList.add("ring-2", "ring-offset-2", "ring-black");
        } else {
            btn.classList.remove("ring-2", "ring-offset-2", "ring-black");
        }
    });
};