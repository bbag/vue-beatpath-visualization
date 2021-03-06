new Vue({
    el: "#app",
    data: {

        // These will be the names of all the ballot options
        sampleLabels: [
            "Aachis Indian", "Bowl Lab", "Chipotle", "Doc Green's", "Einstein's Bagels"
        ],

        // This is the final array/matrix of pairwise preferences generated by the backend
        sampleData: [
            // d[*,A], d[*,B], d[*,C], d[*,D], d[*,E]
            [null, 20, 26, 30, 22],  // d[A,*]
            [25, null, 16, 33, 18],  // d[B,*]
            [19, 29, null, 17, 24],  // d[C,*]
            [15, 12, 28, null, 14],  // d[D,*]
            [23, 27, 21, 31, null] // d[E,*]
        ]
    },
    computed: {

        // This is the transposed data array/matrix, so we can compare strengths between two preferences
        transposedData: function () {

            // This will hold all the transposed values
            let transposedArray = [];

            // Add enough rows to the new transposed array, to be able to add values to them in a sec
            for (let i = 0; i < this.sampleData.length; i++) {
                transposedArray.push([]);
            }

            // For each row in the inputArray...
            for (let i = 0; i < this.sampleData.length; i++) {

                // For each column in the inputArray...
                for (let j = 0; j < this.sampleData.length; j++) {

                    // Add the proper value to its transposed position in the transposedArray
                    transposedArray[j].push(this.sampleData[i][j]);
                }
            }

            // Serve that shit back, yo
            return transposedArray;
        },

        // This will create labels (e.g. A, B, C, D, etc.) for each option on the ballot
        diagramLabels: function () {
            let newLabels = [],
                alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            for (let i = 0; i < this.sampleLabels.length; i++) {
                newLabels.push(alphabet.charAt(i));
            }

            return newLabels;
        }
    },
    methods: {
        // Adds a green or red background to the table cell, depending on its value
        tableCellRedOrGreen(rowIndex, columnIndex) {

            // Get the values of the 2 cells to compare which is stronger
            let cell1 = this.sampleData[rowIndex][columnIndex - 1],
                cell2 = this.transposedData[rowIndex][columnIndex - 1];

            // If the cell's empty then don't do shit
            if (cell1 === null || cell2 === null) {
                return;
            }

            // But if it's weaker then return "red" as the class for that table cell
            else if (cell1 < cell2) {
                return "red";
            }

            // Otherwise, if it's stronger, then return "green"
            else if (cell1 > cell2) {
                return "green";
            }

            // But if it ain't either (i.e. we have a tie) then make it gray
            else {
                return "gray";
            }
        }
    },
    directives: {

        // 1st input is the DOM element itself, 2nd input is the data passed into the custom directive (v-draw-canvas)
        drawCanvas: function (canvas, inputData) {

            /* ----------------------------------------------- */
            /* Useful variables                                */
            /* ----------------------------------------------- */

            var ctx = canvas.getContext("2d"),
                width = canvas.width,
                height = canvas.height,

                // In our HTML canvas, we passed the array [sampleData, sampleLabels] to it through the custom v-draw-canvas directive, so now we're accessing that array below:
                data = inputData.value[0],
                nodes = inputData.value[1],

                // This will be used to check which pairwise preference is stronger
                transposedData = [],

                // Each node will get an alphabetic letter to represent it
                nodeLabels = [],

                // This will hold all the nodes we add to the diagram, for easy referencing later
                nodesArray = [],

                // This will hold all the arrows we draw, along with their strength values
                arrowsArray = [
                    // Items in this array are arrays too, with this form:
                    // [
                    //     "A",
                    //     "B",
                    //     24
                    // ]
                    // This means the arrow goes from A (stronger node) to B (weaker node) with a strength value of 24
                ],

                /* ----------------------------------------------- */
                /* Settings                                        */
                /* ----------------------------------------------- */

                // Padding around the edges of the canvas
                canvasPadding = 48,

                // Settings for the key on the side
                keyFontSize = 16,
                keyFontColor = "#FFF",
                keyFontFamily = "sans-serif",

                // Settings for the nodes (circles labels in them)
                nodeSize = 16,
                nodeFontSize = 16,
                nodeFontFamily = "Arial",
                nodeFillColor = "rgba(255, 255, 255, 0.15)",  // (red, green blue, opacity)
                nodeHasFill = true,
                nodeStrokeColor = "#FFF",
                nodeStrokeThickness = 2,  // I was tempted to use 'thiccness' instead
                nodeTextColor = "#FFF",

                // Settings for the arrow lines
                arrowColor = "#FFF",
                arrowLineThickness = 2,
                arrowDistanceFromNodes = 28,
                arrowHeadSize = 12,
                arrowHeadAngle = Math.PI / 7,  // in radians

                // Settings for the arrow labels (with strength values in them)
                labelHeight = 24,
                labelWidth = 28,
                labelBorderRadius = 9,
                labelFontSize = 12,
                labelFontFamily = "monospace",
                labelFillColor = "rgba(255, 255, 255, 0.15)",
                labelTextColor = "#FFF",

                // Settings for the size, position, and rotation of the diagram
                diagramCenterX = canvas.width - (canvas.height / 2),
                diagramCenterY = canvas.height / 2,
                diagramRadius = canvas.height / 2 - canvasPadding,
                diagramRotationOffset = 90; // in degrees

            // Clear the canvas
            ctx.clearRect(0, 0, width, height);

            /* ----------------------------------------------- */
            /* Helper functions                                */
            /* ----------------------------------------------- */

            // Draws an arrow line given the starting and ending coordinates
            function drawArrowLine(startX, startY, endX, endY) {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineCap = "round";
                ctx.strokeStyle = arrowColor;
                ctx.lineWidth = arrowLineThickness;
                ctx.stroke();
            }

            // Shortens a line segment, given the start/end coordinates of that line segment
            function trimLengths(startCoords, endCoords) {
                let slope = (startCoords.y - endCoords.y) / (startCoords.x - endCoords.x),
                    radians = Math.atan(slope),
                    padding = arrowDistanceFromNodes;

                if (startCoords.x >= endCoords.x) {
                    return {
                        startX: startCoords.x - (padding * Math.cos(radians)),
                        startY: startCoords.y - (padding * Math.sin(radians)),
                        endX: endCoords.x + (padding * Math.cos(radians)),
                        endY: endCoords.y + (padding * Math.sin(radians))
                    }
                }

                else {
                    return {
                        startX: startCoords.x + (padding * Math.cos(radians)),
                        startY: startCoords.y + (padding * Math.sin(radians)),
                        endX: endCoords.x - (padding * Math.cos(radians)),
                        endY: endCoords.y - (padding * Math.sin(radians))
                    }
                }
            }

            // Create node labels (A, B, C, D, etc.)
            let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for (let i = 0; i < nodes.length; i++) {
                nodeLabels.push(alphabet.charAt(i));
            }

            // Draws a node on the diagram
            function Node(text, x, y) {

                // Start drawing the node's circle on the main diagram
                ctx.beginPath();
                ctx.arc(
                    x,           // node's X position on the canvas
                    y,           // node's Y position on the canvas
                    nodeSize,    // node's radius in pixels
                    0,           // draw the node's circle, starting at this angle (in radians)
                    Math.PI * 2, // draw the node's circle, ending at this angle (in radians)
                    false        // false = draw the node's circle clockwise, true = counterclockwise
                );

                // If node should be filled, then fill it
                if (nodeHasFill == true) {
                    ctx.fillStyle = nodeFillColor;
                    ctx.fill();
                }

                if (nodeStrokeThickness > 0) {
                    ctx.strokeStyle = nodeStrokeColor;
                    ctx.lineWidth = nodeStrokeThickness;
                    ctx.stroke();
                }

                // Create text labels on top of the node
                ctx.textAlign = "center";
                ctx.font = "bold " + nodeFontSize + "px " + nodeFontFamily;
                ctx.fillStyle = nodeTextColor;
                ctx.fillText(text, x, y + (nodeFontSize * 0.35));
            }

            // Convert degrees to radians
            function degreesToRadians(degrees) {
                return degrees * (Math.PI / 180);
            }

            // This takes an array/matrix and transposes it, so that we can check which direction between two nodes is stronger
            function transposeArray(inputArray) {

                for (let i = 0; i < inputArray.length; i++) {
                    transposedData.push([]);
                }

                // For each row in the inputArray...
                for (let i = 0; i < inputArray.length; i++) {

                    // For each column in the inputArray...
                    for (let j = 0; j < inputArray.length; j++) {
                        transposedData[j].push(inputArray[i][j]);
                    }
                }
            }

            // Draws an arrow line between two nodes
            function drawArrow(strongerNodeInput, weakerNodeInput, nodeValue) {

                // Find the stronger and weaker nodes (with labels and coordinates) in the nodesArray
                let strongerNode = nodesArray[nodesArray.findIndex(function (x) { return x.label == strongerNodeInput; })],
                    weakerNode = nodesArray[nodesArray.findIndex(function (x) { return x.label == weakerNodeInput; })],
                    lineCoordinates = trimLengths(strongerNode, weakerNode);


                // Arrow's starting and ending points
                let startX = lineCoordinates.startX,
                    startY = lineCoordinates.startY,
                    endX = lineCoordinates.endX,
                    endY = lineCoordinates.endY,
                    slope = (startY - endY) / (startX - endX),
                    radians = Math.atan(slope);

                // Draw the initial line
                drawArrowLine(startX, startY, endX, endY);

                // Coordinates for the arrowhead's corners
                let arrowX1 = startX - (arrowHeadSize * Math.cos(radians + arrowHeadAngle)),
                    arrowY1 = startY - (arrowHeadSize * Math.sin(radians + arrowHeadAngle)),
                    arrowX2 = startX - (arrowHeadSize * Math.cos(radians - arrowHeadAngle)),
                    arrowY2 = startY - (arrowHeadSize * Math.sin(radians - arrowHeadAngle));

                // Flip the arrowhead's coordinates if it draws it on the wrong side of the line
                if (endX > startX) {
                    arrowX1 = startX + (arrowHeadSize * Math.cos(radians + arrowHeadAngle))
                    arrowY1 = startY + (arrowHeadSize * Math.sin(radians + arrowHeadAngle))
                    arrowX2 = startX + (arrowHeadSize * Math.cos(radians - arrowHeadAngle))
                    arrowY2 = startY + (arrowHeadSize * Math.sin(radians - arrowHeadAngle))
                }

                // Draw the arrowhead
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(arrowX1, arrowY1);
                ctx.lineTo(arrowX2, arrowY2);
                ctx.fillStyle = arrowColor;
                ctx.fill();
                ctx.lineJoin = "round";
                ctx.strokeStyle = arrowColor;
                ctx.lineWidth = arrowLineThickness;
                ctx.closePath();
                ctx.stroke();

                // Now with the arrow drawn, add it to the arrowsArray to keep track of later
                arrowsArray.push([strongerNodeInput, weakerNodeInput, nodeValue]);

                // Add a label with the strength value to the arrow line
                function drawArrowLabel(arrowStrengthValue, coordX, coordY) {

                    ctx.beginPath();
                    ctx.moveTo(
                        coordX + (labelWidth / 2),
                        coordY + (labelHeight / 2) - labelBorderRadius
                    );
                    // Right edge
                    ctx.lineTo(
                        coordX + (labelWidth / 2),
                        coordY - (labelHeight / 2) + labelBorderRadius
                    );
                    // Top right corner
                    ctx.arc(
                        coordX + (labelWidth / 2) - labelBorderRadius,
                        coordY - (labelHeight / 2) + labelBorderRadius,
                        labelBorderRadius,
                        0,
                        Math.PI / 2 * 3,
                        true
                    );
                    // Top edge
                    ctx.lineTo(
                        coordX - (labelWidth / 2) + labelBorderRadius,
                        coordY - (labelHeight / 2)
                    );
                    // Top left corner
                    ctx.arc(
                        coordX - (labelWidth / 2) + labelBorderRadius,
                        coordY - (labelHeight / 2) + labelBorderRadius,
                        labelBorderRadius,
                        Math.PI / 2 * 3,
                        Math.PI,
                        true
                    );
                    // Left edge
                    ctx.lineTo(
                        coordX - (labelWidth / 2),
                        coordY + (labelHeight / 2) - labelBorderRadius
                    );
                    // Bottom left corner
                    ctx.arc(
                        coordX - (labelWidth / 2) + labelBorderRadius,
                        coordY + (labelHeight / 2) - labelBorderRadius,
                        labelBorderRadius,
                        Math.PI,
                        Math.PI / 2,
                        true
                    );
                    // Bottom edge
                    ctx.lineTo(
                        coordX + (labelWidth / 2) - labelBorderRadius,
                        coordY + (labelHeight / 2)
                    );
                    // Bottom right corner
                    ctx.arc(
                        coordX + (labelWidth / 2) - labelBorderRadius,
                        coordY + (labelHeight / 2) - labelBorderRadius,
                        labelBorderRadius,
                        Math.PI / 2,
                        Math.PI * 2,
                        true
                    );

                    // Clear the label's background if it has no fill, otherwise just fill it
                    ctx.globalCompositeOperation = "destination-out";
                    ctx.fillStyle = "black";
                    ctx.fill();
                    ctx.globalCompositeOperation = "source-over";
                    ctx.fillStyle = labelFillColor;
                    ctx.fill();

                    // Draw border around the label
                    ctx.stroke();

                    // Draw text inside the label
                    ctx.font = "normal " + labelFontSize + "px " + labelFontFamily;
                    ctx.fillStyle = labelTextColor;
                    ctx.fillText(arrowStrengthValue, coordX, coordY + (labelFontSize * 0.35));
                }

                // Time to draw the value labels on top of the arrow lines: If the # of nodes is even then the lines intersect at their midpoints, so it's confusing to draw labels there... so check if it's even first
                if (nodes.length % 2 == 0) {

                    // If it's even, then we want to offset the label from the line's midpoint to avoid confusion
                    /* console.log("Even! Can't draw labels yet..."); */

                    // Find the midpoint of the arrow's line
                    let offsetX = ((endX - startX) / 2.59) + startX,
                        offsetY = ((endY - startY) / 2.59) + startY;

                    drawArrowLabel(nodeValue, offsetX, offsetY);

                }

                // Otherwise, if the # of nodes are odd, then we just stick the value in the middle! Easy!
                else {

                    // Find the midpoint of the arrow's line
                    let midpointX = (startX + endX) / 2,
                        midpointY = (startY + endY) / 2;

                    drawArrowLabel(nodeValue, midpointX, midpointY);
                }
            }

            /* ----------------------------------------------- */
            /* Step 1: Create all nodes on the diagram         */
            /* ----------------------------------------------- */

            for (let i = 0; i < nodes.length; i++) {

                // Calculate the node's position on the diagram
                let angle = (Math.PI * 2 * (i / nodes.length)) - degreesToRadians(diagramRotationOffset),
                    // stackoverflow.com/questions/2912779/
                    nodeX = diagramRadius * Math.cos(angle) + (diagramCenterX),
                    nodeY = diagramRadius * Math.sin(angle) + (diagramCenterY);

                // Draw the label
                new Node(nodeLabels[i], nodeX, nodeY);

                // Add the label name, and [X,Y] position to the labelsArray
                nodesArray.push({
                    label: nodes[i],
                    x: nodeX,
                    y: nodeY
                })
            }

            /* ----------------------------------------------- */
            /* Step 2: Transpose data to check strengths       */
            /* ----------------------------------------------- */

            transposeArray(data);

            /* ----------------------------------------------- */
            /* Step 3: Draw all the arrow lines between nodes  */
            /* ----------------------------------------------- */

            for (let i = 0; i < data.length; i++) {

                for (let j = 0; j < data.length; j++) {

                    // First make sure the cell's value isn't empty
                    if (data[i][j] !== null) {

                        // Now make sure the current cell's value is stronger than its transposed value
                        if (data[i][j] > transposedData[i][j]) {

                            // Draw an arrow from the stronger point to the weaker point
                            drawArrow(nodes[j], nodes[i], data[i][j]);
                        }
                    }
                }
            }

            /* ----------------------------------------------- */
            /* Step 4: Generate the key on the side            */
            /* ----------------------------------------------- */

            for (let i = 0; i < nodes.length; i++) {
                ctx.textAlign = "left";
                ctx.font = "normal " + keyFontSize + "px " + keyFontFamily;
                ctx.fillStyle = keyFontColor;
                ctx.fillText(
                    nodeLabels[i] + " = " + nodes[i],                               // text
                    canvasPadding - nodeSize,                                         // X position
                    canvasPadding + keyFontSize + ((keyFontSize + 6) * i) - nodeSize  // Y position
                );
            }

            /* ----------------------------------------------- */
            /* Step 5: Add hidden smiley at the bottom  :)     */
            /* ----------------------------------------------- */

            ctx.textAlign = "right";
            ctx.font = "normal 9px serif";
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.fillText(
                ": )",
                width - 5,
                height - 7
            );
        }
    }
})