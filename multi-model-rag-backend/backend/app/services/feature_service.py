"""
Feature service for handling property-based filtering and querying
"""
from typing import List, Dict, Optional
from app.models.repositories import FeatureRepository, FileRepository
from app.models.schemas import FilterRule


class FeatureService:
    """Service for managing features and user property-based access"""
    
    @staticmethod
    def check_filter_match(user: dict, filter_rules: Optional[FilterRule]) -> bool:
        """
        Check if user's properties match the filter rules
        
        Args:
            user: User document from database
            filter_rules: Filter rules to check against
            
        Returns:
            True if user matches all filter criteria, False otherwise
            
        Rules:
            - If filter_rules is None or all fields are None, matches everyone
            - If a filter field is set, user must match that criteria
            - All filter criteria use AND logic (user must match all set filters)
        """
        # No filters means accessible to everyone
        if filter_rules is None:
            return True
        
        # Check age range
        if filter_rules.age_min is not None or filter_rules.age_max is not None:
            user_age = user.get("age")
            if user_age is None:
                return False  # User doesn't have age set, can't match age filter
            
            if filter_rules.age_min is not None and user_age < filter_rules.age_min:
                return False
            
            if filter_rules.age_max is not None and user_age > filter_rules.age_max:
                return False
        
        # Check location
        if filter_rules.allowed_locations:
            user_location = user.get("location")
            if user_location is None:
                return False  # User doesn't have location set
            
            if user_location not in filter_rules.allowed_locations:
                return False  # User's location not in allowed list
        
        # Check gender
        if filter_rules.allowed_genders:
            user_gender = user.get("gender")
            if user_gender is None:
                return False  # User doesn't have gender set
            
            if user_gender not in filter_rules.allowed_genders:
                return False  # User's gender not in allowed list
        
        # Passed all filter checks
        return True
    
    @staticmethod
    async def get_eligible_files(user: dict, feature_id: str) -> List[Dict]:
        """
        Get all files in a feature that match user's properties
        
        Args:
            user: User document from database
            feature_id: Feature ID to get files for
            
        Returns:
            List of file documents that user can access
        """
        # Get all files for this feature
        files = await FileRepository.get_files_by_feature(feature_id)
        
        # Filter files based on user properties
        eligible_files = []
        for file in files:
            # Only include files that are ready (processed successfully)
            if file.get("current_step") != "ready":
                continue
            
            # Parse filter_rules from dict if needed
            filter_rules_data = file.get("filter_rules")
            if filter_rules_data:
                filter_rules = FilterRule(**filter_rules_data)
            else:
                filter_rules = None
            
            # Check if user matches filter criteria
            if FeatureService.check_filter_match(user, filter_rules):
                eligible_files.append(file)
        
        return eligible_files
    
    @staticmethod
    async def get_accessible_collection_names(user: dict, feature_id: str) -> List[str]:
        """
        Get collection names for files that user can access in a feature
        
        Args:
            user: User document from database
            feature_id: Feature ID to get collections for
            
        Returns:
            List of collection names that user can query
        """
        eligible_files = await FeatureService.get_eligible_files(user, feature_id)
        
        # Extract collection names
        collection_names = []
        for file in eligible_files:
            if file.get("collection_name"):
                collection_names.append(file["collection_name"])
        
        return collection_names
