"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import SmartContractABI from "/SmartContractABI.json";

const contractAddress = "0x4ba99aDa4650b6d19ca15e322D4660cb4DEE3ADF";

export default function Home() {
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("view");

    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollDuration, setPollDuration] = useState(60);

    const [selectedPoll, setSelectedPoll] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);

    useEffect(() => {
        const init = async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(
                contractAddress,
                SmartContractABI,
                provider
            );
            setProvider(provider);
            setContract(contract);

            // Check if already connected
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                setIsConnected(true);
                await loadPolls(contract);
            } else {
                setLoading(false);
            }
        };

        init();
    }, []);

    const connectWallet = async () => {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const newProvider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(newProvider);

        const signer = newProvider.getSigner();
        const address = await signer.getAddress();

        setAccount(address);
        setIsConnected(true);

        const newContract = new ethers.Contract(
            contractAddress,
            SmartContractABI,
            signer
        );
        setContract(newContract);

        await loadPolls(newContract);
    };
    const loadPolls = async (contractInstance) => {
        setLoading(true);

        const pollCount = await contractInstance.getPollCount();
        const pollsData = [];

        for (let i = 0; i < pollCount.toNumber(); i++) {
            const poll = await contractInstance.getPoll(i);
            const results = await contractInstance.getPollResults(i);
            const isActive = await contractInstance.isPollActive(i);
            let hasVoted = false;
            let userVote = null;

            if (account) {
                hasVoted = await contractInstance.hasVoted(i, account);
                if (hasVoted) {
                    userVote = await contractInstance.getVote(i, account);
                }
            }

            // Format times
            const startTime = new Date(poll.startTime.toNumber() * 1000);
            const endTime = new Date(poll.endTime.toNumber() * 1000);

            pollsData.push({
                id: i,
                question: poll.question,
                options: poll.options,
                startTime,
                endTime,
                results: results.map((r) => r.toNumber()),
                isActive,
                hasVoted,
                userVote: userVote !== null ? userVote.toNumber() : null,
            });
        }

        setPolls(pollsData);
        setLoading(false);
    };

    const createPoll = async (e) => {
        e.preventDefault();

        if (!isConnected) {
            alert("Please connect your wallet first");
            return;
        }

        if (!provider) {
            alert(
                "Provider not initialized. Please try reconnecting your wallet."
            );
            return;
        }

        const filteredOptions = pollOptions.filter(
            (option) => option.trim() !== ""
        );

        if (pollQuestion.trim() === "") {
            alert("Please enter a question");
            return;
        }

        if (filteredOptions.length < 2) {
            alert("Please enter at least 2 options");
            return;
        }

        setLoading(true);
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);

        const tx = await contractWithSigner.createPoll(
            pollQuestion,
            filteredOptions,
            pollDuration
        );
        await tx.wait();

        // Reset form
        setPollQuestion("");
        setPollOptions(["", ""]);
        setPollDuration(60);

        // Refresh polls
        await loadPolls(contractWithSigner);

        // Switch to view tab
        setActiveTab("view");
    };

    const castVote = async (pollId, optionIndex) => {
        if (!isConnected) {
            alert("Please connect your wallet first");
            return;
        }

        setLoading(true);
        const signer = provider.getSigner();
        const contractWithSigner = contract.connect(signer);

        const tx = await contractWithSigner.vote(pollId, optionIndex);
        await tx.wait();

        // Refresh polls
        await loadPolls(contractWithSigner);
    };

    const addOption = () => {
        setPollOptions([...pollOptions, ""]);
    };

    const removeOption = (index) => {
        if (pollOptions.length > 2) {
            const newOptions = [...pollOptions];
            newOptions.splice(index, 1);
            setPollOptions(newOptions);
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                    Polling Platform DApp (COMP4541)
                </h1>

                {!isConnected ? (
                    <div className="text-center mb-8">
                        <button
                            onClick={connectWallet}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            Connect Wallet
                        </button>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Connect your wallet to view and create polls
                        </p>
                    </div>
                ) : (
                    <div className="mb-6 text-center">
                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                            Connected: {account.slice(0, 6)}...
                            {account.slice(-4)}
                        </span>
                    </div>
                )}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="-mb-px flex">
                        <button
                            className={`py-2 px-4 font-medium text-sm ${
                                activeTab === "view"
                                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                            onClick={() => setActiveTab("view")}
                        >
                            View Polls
                        </button>
                        <button
                            className={`py-2 px-4 font-medium text-sm ${
                                activeTab === "create"
                                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                            onClick={() => setActiveTab("create")}
                        >
                            Create Poll
                        </button>
                    </nav>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === "view" && (
                            <div>
                                {polls.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                        No polls found. Create one to get
                                        started!
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {polls.map((poll) => (
                                            <div
                                                key={poll.id}
                                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/80"
                                            >
                                                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                                                    {poll.question}
                                                </h2>

                                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                                    {poll.isActive ? (
                                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-600 dark:text-red-400 font-medium">
                                                            Closed
                                                        </span>
                                                    )}
                                                    {" · "}
                                                    Created:{" "}
                                                    {poll.startTime.toLocaleString()}
                                                    {" · "}
                                                    Ends:{" "}
                                                    {poll.endTime.toLocaleString()}
                                                </div>

                                                <div className="space-y-3 mt-4">
                                                    {poll.options.map(
                                                        (option, idx) => {
                                                            const voteCount =
                                                                poll.results[
                                                                    idx
                                                                ] || 0;
                                                            const totalVotes =
                                                                poll.results.reduce(
                                                                    (a, b) =>
                                                                        a + b,
                                                                    0
                                                                );
                                                            const percentage =
                                                                totalVotes > 0
                                                                    ? (voteCount /
                                                                          totalVotes) *
                                                                      100
                                                                    : 0;

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="relative"
                                                                >
                                                                    <div className="flex items-center mb-1">
                                                                        <span className="flex-grow font-medium text-gray-800 dark:text-gray-200">
                                                                            {
                                                                                option
                                                                            }
                                                                        </span>
                                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                            {
                                                                                voteCount
                                                                            }{" "}
                                                                            vote
                                                                            {voteCount !==
                                                                            1
                                                                                ? "s"
                                                                                : ""}{" "}
                                                                            (
                                                                            {percentage.toFixed(
                                                                                1
                                                                            )}
                                                                            %)
                                                                        </span>
                                                                    </div>

                                                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                                                        <div
                                                                            className={`h-2.5 rounded-full ${
                                                                                poll.userVote ===
                                                                                idx
                                                                                    ? "bg-blue-600"
                                                                                    : "bg-gray-400 dark:bg-gray-500"
                                                                            }`}
                                                                            style={{
                                                                                width: `${percentage}%`,
                                                                            }}
                                                                        ></div>
                                                                    </div>

                                                                    {poll.isActive &&
                                                                        !poll.hasVoted &&
                                                                        isConnected && (
                                                                            <button
                                                                                onClick={() =>
                                                                                    castVote(
                                                                                        poll.id,
                                                                                        idx
                                                                                    )
                                                                                }
                                                                                className="mt-1 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                                            >
                                                                                Vote
                                                                            </button>
                                                                        )}

                                                                    {poll.userVote ===
                                                                        idx && (
                                                                        <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 inline-block">
                                                                            Your
                                                                            vote
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "create" && (
                            <div>
                                <form
                                    onSubmit={createPoll}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Poll Question
                                        </label>
                                        <input
                                            type="text"
                                            value={pollQuestion}
                                            onChange={(e) =>
                                                setPollQuestion(e.target.value)
                                            }
                                            placeholder="What is your favorite color?"
                                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Options
                                        </label>
                                        {pollOptions.map((option, index) => (
                                            <div
                                                key={index}
                                                className="flex mb-2"
                                            >
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) =>
                                                        handleOptionChange(
                                                            index,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder={`Option ${
                                                        index + 1
                                                    }`}
                                                    className="flex-grow p-2 border rounded-md mr-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                                                    required
                                                />
                                                {index >= 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeOption(index)
                                                        }
                                                        className="text-red-500 dark:text-red-400 px-2"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            className="text-blue-500 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300"
                                        >
                                            + Add Option
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Duration (in minutes)
                                        </label>
                                        <input
                                            type="number"
                                            value={pollDuration}
                                            onChange={(e) =>
                                                setPollDuration(
                                                    parseInt(e.target.value)
                                                )
                                            }
                                            min="1"
                                            className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                                            required
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                            disabled={!isConnected}
                                        >
                                            Create Poll
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
