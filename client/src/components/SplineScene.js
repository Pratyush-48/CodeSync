import React, { useEffect, useRef } from "react";
import { Application } from "@splinetool/runtime";

const SplineScene = ({ setIsLoading }) => {
  const canvasRef = useRef(null);
  const splineAppRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const loadSpline = async () => {
      try {
        // Initialize Spline application
        splineAppRef.current = new Application(canvasRef.current);
        const spline = splineAppRef.current;

        // Load the scene
        await spline.load("https://prod.spline.design/96ombws4AIxxYvwS/scene.splinecode");
        
        console.log("Spline scene loaded successfully");
        
        // Only use available methods
        if (spline.setZoom) spline.setZoom(0.35);
        
        // These methods might not be available in all versions
        // spline.setControls(false);
        // spline.setMouseControls(false);
        
        // Make canvas visible
        canvasRef.current.style.opacity = "1";
        setIsLoading(false);
      } catch (error) {
        console.error("Spline loading error:", error);
        setIsLoading(false);
      }
    };

    loadSpline();

    return () => {
      if (splineAppRef.current) {
        splineAppRef.current.dispose();
        splineAppRef.current = null;
      }
    };
  }, [setIsLoading]);

  return (
    <div className="spline-background">
      <canvas
        ref={canvasRef}
        className="spline-canvas"
        style={{ 
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.5s ease-out",
          width: "100%",
          height: "100%"
        }}
      />
      <div className="spline-overlay"></div>
    </div>
  );
};

export default SplineScene;