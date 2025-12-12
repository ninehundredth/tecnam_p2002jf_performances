import UIKit
import Capacitor

class AnimatedSplashViewController: UIViewController {
    
    private var aircraftImageView: UIImageView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupSplashScreen()
        
        // Start animation after a brief delay to ensure view is laid out
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.animateAircraft()
        }
    }
    
    private func setupSplashScreen() {
        // Set background color to match app theme
        view.backgroundColor = UIColor(red: 102/255.0, green: 126/255.0, blue: 234/255.0, alpha: 1.0)
        
        // Create aircraft image view
        aircraftImageView = UIImageView()
        
        // Try multiple methods to load the image
        // Method 1: From asset catalog (recommended)
        if let image = UIImage(named: "p2002-mkii-top-min") {
            aircraftImageView.image = image
        }
        // Method 2: From bundle resources
        else if let imagePath = Bundle.main.path(forResource: "p2002-mkii-top-min", ofType: "png") {
            aircraftImageView.image = UIImage(contentsOfFile: imagePath)
        }
        // Method 3: From Assets.xcassets directory
        else if let assetsPath = Bundle.main.path(forResource: "p2002-mkii-top-min", ofType: "png", inDirectory: "Assets.xcassets") {
            aircraftImageView.image = UIImage(contentsOfFile: assetsPath)
        }
        // Method 4: Try loading from main bundle with different paths
        else if let bundlePath = Bundle.main.path(forResource: "p2002-mkii-top-min", ofType: "png", inDirectory: nil) {
            aircraftImageView.image = UIImage(contentsOfFile: bundlePath)
        }
        
        aircraftImageView.contentMode = .scaleAspectFit
        view.addSubview(aircraftImageView)
        
        // Set initial size and position (will be positioned below screen)
        let imageSize: CGFloat = min(view.bounds.width * 0.6, view.bounds.height * 0.4)
        aircraftImageView.frame = CGRect(
            x: (view.bounds.width - imageSize) / 2,
            y: view.bounds.height + 100, // Start below screen
            width: imageSize,
            height: imageSize
        )
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        // Update frame if view size changes
        if aircraftImageView != nil {
            let imageSize: CGFloat = min(view.bounds.width * 0.6, view.bounds.height * 0.4)
            if aircraftImageView.frame.origin.y > view.bounds.height {
                // Only update if still in initial position
                aircraftImageView.frame = CGRect(
                    x: (view.bounds.width - imageSize) / 2,
                    y: view.bounds.height + 100,
                    width: imageSize,
                    height: imageSize
                )
            }
        }
    }
    
    private func animateAircraft() {
        // Calculate final position (centered vertically)
        let finalY = (view.bounds.height - aircraftImageView.bounds.height) / 2
        let startY = view.bounds.height + 100
        
        // Set initial position
        aircraftImageView.frame.origin.y = startY
        
        // Animate from bottom to center over 1.5 seconds
        UIView.animate(withDuration: 1.5, delay: 0.0, options: [.curveEaseOut], animations: {
            self.aircraftImageView.frame.origin.y = finalY
        }, completion: { _ in
            // After animation completes, wait a moment then hide splash screen
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                self.hideSplashScreen()
            }
        })
    }
    
    private func hideSplashScreen() {
        // Fade out the splash screen
        UIView.animate(withDuration: 0.3, animations: {
            self.view.alpha = 0.0
        }, completion: { _ in
            // Remove our custom splash view
            self.view.removeFromSuperview()
            self.removeFromParent()
            
            // Hide Capacitor's splash screen by executing JavaScript
            // Access the bridge through the parent view controller
            DispatchQueue.main.async {
                if let parent = self.parent as? CAPBridgeViewController {
                    parent.webView?.evaluateJavaScript("window.Capacitor?.Plugins?.SplashScreen?.hide()", completionHandler: nil)
                } else if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                          let window = windowScene.windows.first,
                          let bridgeVC = window.rootViewController as? CAPBridgeViewController {
                    bridgeVC.webView?.evaluateJavaScript("window.Capacitor?.Plugins?.SplashScreen?.hide()", completionHandler: nil)
                }
            }
        })
    }
}

