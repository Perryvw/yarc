type Result<SuccessData, ErrorData = never> =
    | { success: true; value: SuccessData }
    | { success: false; error: ErrorData };

type Cancellable<Data> = { cancelled: true } | { cancelled: false; result: Data };
