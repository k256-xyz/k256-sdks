<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Network congestion state.
 */
enum NetworkState: int
{
    /** Low congestion - minimal fees needed */
    case Low = 0;
    /** Normal congestion */
    case Normal = 1;
    /** High congestion - higher fees recommended */
    case High = 2;
    /** Extreme congestion - maximum fees recommended */
    case Extreme = 3;
}
