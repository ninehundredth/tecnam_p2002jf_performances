#!/usr/bin/env node

/**
 * Setup script for iOS animated splash screen
 * This script copies the AnimatedSplashViewController.swift file to the iOS project
 * and ensures it's added to the Xcode project file.
 * 
 * Run this after: npx cap sync ios
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', 'ios-templates');
const IOS_APP_DIR = path.join(__dirname, '..', 'ios', 'App', 'App');
const SWIFT_FILE = 'AnimatedSplashViewController.swift';

function copySplashViewController() {
  const sourceFile = path.join(TEMPLATE_DIR, SWIFT_FILE);
  const destFile = path.join(IOS_APP_DIR, SWIFT_FILE);

  if (!fs.existsSync(sourceFile)) {
    console.error(`Error: Template file not found: ${sourceFile}`);
    process.exit(1);
  }

  if (!fs.existsSync(IOS_APP_DIR)) {
    console.log('iOS directory does not exist yet. Run "npx cap add ios" first.');
    return;
  }

  // Copy the file
  fs.copyFileSync(sourceFile, destFile);
  console.log(`✓ Copied ${SWIFT_FILE} to iOS project`);

  // Check if file is already in project.pbxproj
  const projectFile = path.join(__dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  
  if (fs.existsSync(projectFile)) {
    const projectContent = fs.readFileSync(projectFile, 'utf8');
    
    if (!projectContent.includes('AnimatedSplashViewController.swift')) {
      console.log('\n⚠️  Warning: AnimatedSplashViewController.swift is not in project.pbxproj');
      console.log('   You need to add it manually in Xcode:');
      console.log('   1. Open ios/App/App.xcworkspace in Xcode');
      console.log('   2. Right-click on the App/App folder in Project Navigator');
      console.log('   3. Select "Add Files to App..."');
      console.log('   4. Navigate to ios/App/App/ and select AnimatedSplashViewController.swift');
      console.log('   5. Make sure "Copy items if needed" is UNCHECKED (file already exists)');
      console.log('   6. Make sure "Create groups" is selected');
      console.log('   7. Make sure the "App" target is checked');
      console.log('   8. Click "Add"');
      console.log('\n   Also, make sure AppDelegate.swift includes the animated splash screen code.');
      console.log('   See ios-templates/AppDelegate.patch for the required changes.\n');
    } else {
      console.log('✓ AnimatedSplashViewController.swift is already in project.pbxproj');
    }
  }
}

// Run the setup
try {
  copySplashViewController();
  console.log('\n✓ iOS splash screen setup complete!');
} catch (error) {
  console.error('Error setting up iOS splash screen:', error.message);
  process.exit(1);
}

