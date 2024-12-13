// Function to update chart dimensions and redraw the chart
function updateChartDimensions() {
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
    const tooltip = d3.select("#tooltip");

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
            .range([0, height]);

        // Scale font_size to circle radius
        const radius = d3.scaleSqrt()
            .domain([d3.min(data, d => d.font_size), d3.max(data, d => d.font_size)])
            .range([4, 16]);

        const density = d3.contourDensity()
            .x(d => x(d.left_pixel))
            .y(d => y(d.top_pixel))
            .size([width, height])
            .thresholds(30)
            .bandwidth(40);

        // Create color scale for contours
        const color = d3.scaleLinear()
            .domain(d3.extent(density(data), d => d.value))
            .range(["#06D6A0", "#EF476F"]);

        // Draw the chart
        // Draw the chart with smooth transition for search result
        function drawChart(w_masks, searchTerm = "") {
            // Clear previous chart elements
            svg.selectAll("*").remove();

            // Filter data based on search term
            const filteredData = searchTerm ? data.filter(d => d.genre_name.toLowerCase().includes(searchTerm.toLowerCase())) : data;

            // Create circles for scatter plot with a transition
            const dots = svg.append("g")
                .selectAll(".dot")
                .data(filteredData)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.left_pixel))
                .attr("cy", d => y(d.top_pixel))
                .attr("r", 0)  // Initially set radius to 0 for transition effect
                .attr("fill", d => d.color)
                .attr("opacity", 0.7)
                .on("mouseover", function(event, d) {
                    tooltip.style("visibility", "visible")
                        .html(`Genre: ${d.genre_name}`)
                        .style("top", `${event.pageY + 5}px`)
                        .style("left", `${event.pageX + 5}px`)
                        .style("background-color", d.color);
                })
                .on("mouseout", () => tooltip.style("visibility", "hidden"))
                .on("click", function(event, d) {
                    if (selectedDot === d) {
                        audio.pause();
                        selectedDot = null;
                        d3.select(this).classed("selected", false);
                    } else {
                        if (d.preview_url) {
                            audio.src = d.preview_url;
                            audio.play();
                        }
                        selectedDot = d;
                        d3.selectAll(".dot").classed("selected", false);
                        d3.select(this).classed("selected", true);
                    }
                });

            // Apply smooth transition for the radius and opacity
            dots.transition()
                .duration(500)  // Transition duration (500ms)
                .attr("r", d => radius(d.font_size));  // Transition to actual radius

            // Generate contours
            const contours = density(filteredData);

            // Create contour paths with optional clipping mask
            if (w_masks) {
                svg.append("g")
                    .selectAll(".contour")
                    .data(contours)
                    .enter().append("path")
                    .attr("class", "contour")
                    .attr("d", d3.geoPath())
                    .attr("stroke-width", 2)
                    .attr("stroke", d => color(d.value))
                    .attr("stroke-linejoin", "round")
                    .style("fill", d => color(d.value).replace(")", ", 0.3)"));
            }

            // Add x-axis without lines, ticks, and numbers, only if mask is off
            if (!w_masks) {
                const xAxis = d3.axisBottom(x).ticks(5).tickSize(0).tickFormat(() => "");
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", `translate(0, ${height})`)
                    .call(xAxis)
                    .selectAll(".domain").remove();

                // Add x-axis label
                svg.append("text")
                    .attr("class", "axis-label")
                    .attr("x", width / 2)
                    .attr("y", height + margin.bottom - 10)
                    .style("text-anchor", "middle")
                    .text("← Denser & Atmospheric, Spikier & Bouncier →");
            }

            // Add y-axis without lines, ticks, and numbers, only if mask is off
            if (!w_masks) {
                const yAxis = d3.axisLeft(y).ticks(5).tickSize(0).tickFormat(() => "");
                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .selectAll(".domain").remove();

                // Add y-axis label
                svg.append("text")
                    .attr("class", "axis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("x", -height / 2)
                    .attr("y", -margin.left + 20)
                    .style("text-anchor", "middle")
                    .text("← Organic, Mechanical & Electric →");
            }
        }

        // Event listener for the mask toggle
        const maskToggle = document.getElementById("toggle-mask");
        maskToggle.addEventListener("change", (event) => {
            drawChart(event.target.checked, document.getElementById("genre-search").value);
        });

        // Debounced search functionality
        let debounceTimeout;
        document.getElementById("genre-search").addEventListener("input", () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const searchTerm = document.getElementById("genre-search").value;
                drawChart(maskToggle.checked, searchTerm);
            }, 300); // 300ms delay before triggering search
        });

        // Clear button functionality
        document.getElementById("clear-button").addEventListener("click", () => {
            document.getElementById("genre-search").value = '';
            drawChart(maskToggle.checked);
        });

        // Initial chart render with mask enabled
        drawChart(maskToggle.checked);
    });
}

// Initial chart render
updateChartDimensions();

// Window resize event for responsiveness
window.addEventListener("resize", updateChartDimensions);