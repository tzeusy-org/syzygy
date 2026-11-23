# Resumed and initial Design audit failures at da2056a5a

[Observed] Normal completion and delivery-stop passed. Public interrupted recovery verified and claimed the stop boundary. Fresh Design completed one provider exchange, planned its first ordered reply, and began the prepared audit append. The append rejected after 5,030 ms. The physical audit contained the prepared row. The writer supplied no verified reader, and the socket reply did not start. [Hosted integration](https://github.com/tzeusy-org/syzygy/actions/runs/45057465334/job/137316382145)

[Observed] The 300th resource sample accepted both censuses and fresh verification. Its final confirmation refused at 425 ms, after the broker fault. The first 299 samples confirmed. The resumed controller reported transport unavailable and Design ended on SIGTERM. The initial eligible-stop scenario also failed before it could resume. Its audit closed poisoned with one delivery and no committed ordered verdict.

[Inferred] The five-second audit deadline is the leading explanation for the prepared append refusal. The prior exact replay accepted the same operation in 4,868 ms. [Unknown] Which audit subphase consumed the remaining time, and which specific operation first refused in the eligible-stop scenario. [Prior hosted integration](https://github.com/tzeusy-org/syzygy/actions/runs/45054497584/job/137308740751)
