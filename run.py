import os, sys, webbrowser

def main():
    print("=" * 60)
    print(" [*] Launching RetailCart Fullstack Application")
    print("=" * 60)
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, "backend")
    
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    
    print("\n[1/2] Starting Python FastAPI Server on http://127.0.0.1:8000...")
    print("      - Auto API Docs at: http://127.0.0.1:8000/docs")
    print("      - Storefront UI at: http://127.0.0.1:8000\n")
    
    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception:
        pass
    
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, app_dir=backend_dir)

if __name__ == "__main__":
    main()
