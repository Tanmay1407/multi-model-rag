"""
Test script for the Delete User API endpoint

This script demonstrates how to test the user deletion endpoint.
Run this after starting the backend server.
"""

import requests
import json
from typing import Dict

# Base URL for the API
BASE_URL = "http://localhost:8000"

def create_test_user() -> Dict:
    """Create a test user and return the response with token"""
    signup_data = {
        "username": f"testuser_{int(__import__('time').time())}",
        "email": f"test_{int(__import__('time').time())}@example.com",
        "password": "testpass123",
        "location": "Test City",
        "age": 25
    }
    
    print("🔹 Creating test user...")
    response = requests.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ User created: {data['user']['username']}")
        print(f"   User ID: {data['user']['user_id']}")
        return data
    else:
        print(f"❌ Failed to create user: {response.status_code}")
        print(f"   Error: {response.text}")
        return None


def get_user_profile(token: str) -> Dict:
    """Get current user profile"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔹 Getting user profile...")
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Profile retrieved: {data['username']}")
        return data
    else:
        print(f"❌ Failed to get profile: {response.status_code}")
        print(f"   Error: {response.text}")
        return None


def delete_user(token: str) -> Dict:
    """Delete user account"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔹 Deleting user account...")
    response = requests.delete(f"{BASE_URL}/api/auth/me", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ User deleted successfully!")
        print(f"   Message: {data['message']}")
        print(f"   Files deleted: {data['deleted_files']}")
        print(f"   Chat sessions deleted: {data['deleted_chat_sessions']}")
        return data
    else:
        print(f"❌ Failed to delete user: {response.status_code}")
        print(f"   Error: {response.text}")
        return None


def verify_deletion(token: str) -> bool:
    """Verify that the user was actually deleted"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔹 Verifying deletion...")
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    
    if response.status_code == 401:
        print("✅ User successfully deleted (token no longer valid)")
        return True
    else:
        print(f"⚠️  Unexpected response: {response.status_code}")
        print(f"   Response: {response.text}")
        return False


def main():
    """Run the complete test workflow"""
    print("=" * 60)
    print("DELETE USER API TEST")
    print("=" * 60)
    
    # Step 1: Create a test user
    signup_response = create_test_user()
    if not signup_response:
        print("\n❌ Test failed: Could not create user")
        return
    
    token = signup_response['access_token']
    user_id = signup_response['user']['user_id']
    username = signup_response['user']['username']
    
    # Step 2: Get user profile to verify creation
    profile = get_user_profile(token)
    if not profile:
        print("\n❌ Test failed: Could not get user profile")
        return
    
    # Step 3: Delete the user
    deletion_result = delete_user(token)
    if not deletion_result:
        print("\n❌ Test failed: Could not delete user")
        return
    
    # Step 4: Verify deletion
    verified = verify_deletion(token)
    
    # Final summary
    print("\n" + "=" * 60)
    if verified:
        print("✅ ALL TESTS PASSED")
        print(f"   User '{username}' (ID: {user_id}) was successfully deleted")
        print(f"   Files deleted: {deletion_result['deleted_files']}")
        print(f"   Sessions deleted: {deletion_result['deleted_chat_sessions']}")
    else:
        print("⚠️  TEST COMPLETED WITH WARNINGS")
        print("   Please manually verify the deletion in the database")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to the backend server")
        print("   Please make sure the server is running at http://localhost:8000")
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
