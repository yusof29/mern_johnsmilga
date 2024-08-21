import { StatusCodes } from "http-status-codes";
import Job from "../models/JobModel.js";
import mongoose from "mongoose";
import day from "dayjs";

// GET ALL
export const getAllJobs = async (req, res) => {
  const { search, jobStatus, jobType, sort } = req.query;

  const queryObject = {
    createdBy: req.user.userId,
  };

  // SEARCH
  if (search) {
    queryObject.$or = [
      { position: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }

  // JOB STATUS
  if (jobStatus && jobStatus !== "all") {
    queryObject.jobStatus = jobStatus;
  }

  // JOB TYPE
  if (jobType && jobType !== "all") {
    queryObject.jobType = jobType;
  }

  // SORT
  const sortOptions = {
    newest: "-createdAt",
    oldest: "createdAt",
    "a-z": "position",
    "z-a": "-position",
  };

  const sortKey = sortOptions[sort] || sortOptions.newest;

  // TOTAL JOBS
  const totalJobs = await Job.countDocuments(queryObject);

  // PAGINATION
  const page = Number(req.query.page) || 1; // the number of the current page
  const limit = Number(req.query.limit) || 10; // the number of jobs that will be displayed per page
  const skip = (page - 1) * limit; // the number of jobs (previous page's jobs) that will not displayed on the current page
  const numOfPages = Math.ceil(totalJobs / limit); // total of pages that will be displayed for navigation

  const jobs = await Job.find(queryObject)
    .sort(sortKey)
    .skip(skip)
    .limit(limit);

  res
    .status(StatusCodes.OK)
    .json({ totalJobs, numOfPages, currentPage: page, jobs });
};

// CREATE
export const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId;
  const newJob = await Job.create(req.body);
  res.status(StatusCodes.CREATED).json({ newJob });
};

// GET ONE
export const getJob = async (req, res) => {
  const { id } = req.params;
  const foundJob = await Job.findById(id);

  res.status(StatusCodes.OK).json({ foundJob });
};

// UPDATE
export const updateJob = async (req, res) => {
  const { company, position } = req.body;

  const { id } = req.params;

  const foundJob = await Job.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  res.status(StatusCodes.OK).json({ msg: "job updated", updatedJob: foundJob });
};

// DELETE
export const deleteJob = async (req, res) => {
  const { id } = req.params;

  const foundJob = await Job.findByIdAndDelete(id);

  res.status(StatusCodes.OK).json({ msg: "job deleted", deletedJob: foundJob });
};

export const showStats = async (req, res) => {
  let stats = await Job.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    { $group: { _id: "$jobStatus", count: { $sum: 1 } } },
  ]);

  stats = stats.reduce((acc, curr) => {
    const { _id: title, count } = curr;
    acc[title] = count;
    return acc;
  }, {});

  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  let monthlyApplications = await Job.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 6 },
  ]);

  monthlyApplications = monthlyApplications
    .map((item) => {
      const {
        _id: { year, month },
        count,
      } = item;

      const date = day()
        .month(month - 1)
        .year(year)
        .format("MMM YY");
      return { date, count };
    })
    .reverse();

  res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications });
};
