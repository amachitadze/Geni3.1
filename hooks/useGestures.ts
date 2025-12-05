import React, { useState, useRef, useCallback } from 'react';

export const useGestures = () => {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isZoomingViaWheel, setIsZoomingViaWheel] = useState(false);
  
  const zoomTimeoutRef = useRef<number | null>(null);
  const pinchStartDistanceRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => setTransform({ scale: 1, x: 0, y: 0 }), []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    setIsZoomingViaWheel(true);
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = window.setTimeout(() => {
      setIsZoomingViaWheel(false);
    }, 150);

    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, transform.scale + scaleAmount), 3);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newX = transform.x + (mouseX - transform.x) * (1 - newScale / transform.scale);
    const newY = transform.y + (mouseY - transform.y) * (1 - newScale / transform.scale);
    setTransform({ scale: newScale, x: newX, y: newY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if the user clicks on the background
    if ((e.target as HTMLElement).closest('[data-person-id], .person-card-buttons, button, svg g')) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    if(viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform(prev => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if(viewportRef.current) viewportRef.current.style.cursor = 'grab';
  };

  const getDistance = (touches: React.TouchList): number => {
    const [touch1, touch2] = [touches[0], touches[1]];
    return Math.sqrt(
        Math.pow(touch1.clientX - touch2.clientX, 2) + 
        Math.pow(touch1.clientY - touch2.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-person-id], .person-card-buttons, button, svg g')) {
        return;
    }
    if (e.touches.length === 1) { // Panning
        const touch = e.touches[0];
        setIsPanning(true);
        setPanStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
    } else if (e.touches.length === 2) { // Zooming
        setIsPanning(false); // Disable panning when zooming
        pinchStartDistanceRef.current = getDistance(e.touches);
        pinchStartScaleRef.current = transform.scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // e.preventDefault(); // Note: handled in parent usually, or style touch-action: none
    if (isPanning && e.touches.length === 1) { // Panning
        const touch = e.touches[0];
        setTransform(prev => ({ ...prev, x: touch.clientX - panStart.x, y: touch.clientY - panStart.y }));
    } else if (e.touches.length === 2 && pinchStartDistanceRef.current > 0) { // Zooming
        const currentDistance = getDistance(e.touches);
        const scaleFactor = currentDistance / pinchStartDistanceRef.current;
        const newScale = Math.min(Math.max(0.2, pinchStartScaleRef.current * scaleFactor), 3);
        
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const midpointX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const midpointY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

        const newX = transform.x + (midpointX - transform.x) * (1 - newScale / transform.scale);
        const newY = transform.y + (midpointY - transform.y) * (1 - newScale / transform.scale);
        
        setTransform({ scale: newScale, x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
          pinchStartDistanceRef.current = 0;
      }
      if (e.touches.length < 1) {
          setIsPanning(false);
      } else if (e.touches.length === 1) {
          const touch = e.touches[0];
          setIsPanning(true);
          setPanStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
      }
  };

  const handleZoomBtn = (direction: 'in' | 'out') => {
      const scaleAmount = 0.2;
      const newScale = direction === 'in' ? transform.scale + scaleAmount : transform.scale - scaleAmount;
      setTransform(prev => ({...prev, scale: Math.min(Math.max(0.2, newScale), 3)}));
  };

  return {
    transform,
    setTransform,
    isPanning,
    isZoomingViaWheel,
    viewportRef,
    resetTransform,
    handlers: {
        onWheel: handleWheel,
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseUp,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    },
    handleZoomBtn
  };
};