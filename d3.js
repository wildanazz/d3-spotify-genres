// Function to update chart dimensions and redraw the chart
function updateChartDimensions() {
    // Update width and height based on window size
    const margin = { top: 20, right: 40, bottom: 60, left: 80 };
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    // Clear the existing chart
    d3.select("#scatterplot").select("svg").remove();

    // Append SVG with new dimensions
    const svg = d3.select("#scatterplot").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up tooltip
    const tooltip = d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("box-shadow", "0px 0px 10px rgba(0, 0, 0, 0.1)")
        .style("pointer-events", "none");

    // Create audio element for preview
    const audio = new Audio();
    audio.style.display = "none";  // Hide audio element

    // Variable to track the selected dot (for toggle functionality)
    let selectedDot = null;

    // Load CSV data
    d3.csv("data/enao-genres.csv").then(data => {
        // Parse numeric values and set default color
        data.forEach(d => {
            d.top_pixel = +d.top_pixel;
            d.left_pixel = +d.left_pixel;
            d.font_size = +d.font_size;
            d.color = d.color || "#69b3a2"; // Default color if not specified
        });

        // Set scales
        const x = d3.scaleLinear()
            .domain([d3.min(data, d => d.left_pixel) - 10, d3.max(data, d => d.left_pixel) + 10])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([d3.min(data, d => d.top_pixel) - 10, d3.max(data, d => d.top_pixel) + 10])
            .range([0, height]);  // Inverted range for y-axis

        // Scale font_size to circle radius
        const radius = d3.scaleSqrt()
            .domain([d3.min(data, d => d.font_size), d3.max(data, d => d.font_size)])
            .range([4, 16]);  // Circle sizes

        // Draw the chart
        function drawChart() {
            // Clear previous chart elements
            svg.selectAll("*").remove();

            // Create circles for scatter plot
            const circles = svg.append("g")
                .selectAll(".dot")
                .data(data)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.left_pixel))
                .attr("cy", d => y(d.top_pixel))
                .attr("r", d => radius(d.font_size))
                .attr("fill", d => d.color)
                .on("mouseover", function(event, d) {
                    // Display dynamic tooltip content
                    tooltip.style("visibility", "visible")
                        .html(`
                            <strong>Genre:</strong> ${d.genre_name}<br>
                        `)
                        .style("top", `${event.pageY + 5}px`)
                        .style("left", `${event.pageX + 5}px`)
                        .style("background-color", d.color);
                })
                .on("mouseout", () => tooltip.style("visibility", "hidden"))
                .on("click", function(event, d) {
                    // Handle dot click events
                    if (selectedDot === d) {
                        audio.pause();  // Stop audio if same dot is clicked again
                        selectedDot = null;  // Reset selected dot
                        d3.select(this).classed("selected", false);  // Remove selection
                    } else {
                        if (d.preview_url) {
                            audio.src = d.preview_url;  // Set audio source
                            audio.play();  // Play the audio
                        }
                        selectedDot = d;  // Update selected dot
                        d3.selectAll(".dot").classed("selected", false);  // Remove selection from all dots
                        d3.select(this).classed("selected", true);  // Mark current dot as selected
                    }
                });

            // Add x-axis without lines, ticks, and numbers
            const xAxis = d3.axisBottom(x).ticks(5).tickSize(0).tickFormat(() => "");
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", `translate(0, ${height})`)
                .call(xAxis)
                .selectAll(".domain")  // Remove the axis line
                .remove();

            // Add x-axis label
            svg.append("text")
                .attr("class", "axis-label")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 10)
                .style("text-anchor", "middle")
                .text("← Denser & Atmospheric, Spikier & Bouncier →");

            // Add y-axis without lines, ticks, and numbers
            const yAxis = d3.axisLeft(y).ticks(5).tickSize(0).tickFormat(() => "");
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .selectAll(".domain")  // Remove the axis line
                .remove();

            // Add y-axis label
            svg.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 20)
                .style("text-anchor", "middle")
                .text("← Organic, Mechanical & Electric →");
        }

        drawChart();
    });
}

// Initial chart render
updateChartDimensions();

// Window resize event for responsiveness
window.addEventListener("resize", updateChartDimensions);