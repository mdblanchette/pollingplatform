// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PollSystem {
    struct Poll {
        string question;
        string[] options;
        uint256 startTime;
        uint256 endTime;
        bool exists;
    }
    
    struct Vote {
        bool hasVoted;
        uint256 optionIndex;
    }
    
    // Set variables
    mapping(uint256 => Poll) private polls;
    mapping(uint256 => mapping(address => Vote)) private votes;
    mapping(uint256 => mapping(uint256 => uint256)) private results;

    uint256 private pollCount;
    
    // Set events
    event PollCreated(uint256 indexed pollId, string question, string[] options, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed pollId, address indexed voter, uint256 optionIndex);
    
    // Create a new poll
    function createPoll(string memory _question, string[] memory _options, uint256 _durationInMinutes) public returns (uint256) {
        require(_options.length >= 2, "Poll must have at least 2 options");
        require(_durationInMinutes > 0, "Duration must be greater than 0");
        
        uint256 pollId = pollCount;
        
        polls[pollId].question = _question;
        polls[pollId].options = _options;
        polls[pollId].startTime = block.timestamp;
        polls[pollId].endTime = block.timestamp + (_durationInMinutes * 1 minutes);
        polls[pollId].exists = true;
        
        pollCount++;
        
        emit PollCreated(pollId, _question, _options, polls[pollId].startTime, polls[pollId].endTime);
        
        return pollId;
    }
    
    // Make a vote (1 wallet allows only 1 vote)
    function vote(uint256 _pollId, uint256 _optionIndex) public {
        require(polls[_pollId].exists, "Poll does not exist");
        require(block.timestamp >= polls[_pollId].startTime, "Poll has not started yet");
        require(block.timestamp <= polls[_pollId].endTime, "Poll has ended");
        require(!votes[_pollId][msg.sender].hasVoted, "You have already voted in this poll");
        require(_optionIndex < polls[_pollId].options.length, "Invalid option");
        
        votes[_pollId][msg.sender].hasVoted = true;
        votes[_pollId][msg.sender].optionIndex = _optionIndex;
        
        results[_pollId][_optionIndex]++;
        
        emit VoteCast(_pollId, msg.sender, _optionIndex);
    }
    
    // Check if a user has voted in a poll
    function hasVoted(uint256 _pollId, address _voter) public view returns (bool) {
        return votes[_pollId][_voter].hasVoted;
    }
    
    // Get the option that a user voted for
    function getVote(uint256 _pollId, address _voter) public view returns (uint256) {
        require(votes[_pollId][_voter].hasVoted, "User has not voted in this poll");
        return votes[_pollId][_voter].optionIndex;
    }
    
    // Get poll information
    function getPoll(uint256 _pollId) public view returns (
        string memory question,
        string[] memory options,
        uint256 startTime,
        uint256 endTime,
        bool exists
    ) {
        require(polls[_pollId].exists, "Poll does not exist");
        
        Poll memory poll = polls[_pollId];
        return (poll.question, poll.options, poll.startTime, poll.endTime, poll.exists);
    }
    
    // Get poll results
    function getPollResults(uint256 _pollId) public view returns (uint256[] memory) {
        require(polls[_pollId].exists, "Poll does not exist");
        
        uint256[] memory counts = new uint256[](polls[_pollId].options.length);
        
        for (uint256 i = 0; i < polls[_pollId].options.length; i++) {
            counts[i] = results[_pollId][i];
        }
        
        return counts;
    }
    
    // Get the number of polls
    function getPollCount() public view returns (uint256) {
        return pollCount;
    }
    
    // Check if a poll is active
    function isPollActive(uint256 _pollId) public view returns (bool) {
        require(polls[_pollId].exists, "Poll does not exist");
        return (block.timestamp >= polls[_pollId].startTime && block.timestamp <= polls[_pollId].endTime);
    }
}